"""Pedagogy simplification — Hindi in, simpler Hindi out.

One LLM call. It runs *before* translation, and it is the step that
makes the Santali output usable: IndicTrans2 leaks another script when a
word falls outside its training distribution, so replacing textbook
vocabulary with words a Jharkhand child actually uses is not just a
readability win, it is what keeps the translation clean (PRD.md §5).

Prompts live here as named constants, never inline in a route file, so
changing one is a one-line diff in one place (RULES.md §3).

Two providers are supported, chosen by LLM_PROVIDER:

  gemini             Google's REST API, keyed by LLM_API_KEY.
  openai_compatible  Any OpenAI-shaped /chat/completions endpoint, via
                     the openai SDK pointed at LLM_BASE_URL, with the
                     model slug in LLM_MODEL.

Both return the same shape, and the readability numbers are measured
here either way rather than asked of the model.

This does NOT translate. Hindi goes in and Hindi comes out; the
honesty boundary in PRD.md §4 is untouched by anything in this file.
"""

import json
import logging
import os
import re
import time
from functools import lru_cache

import requests

# The message a teacher sees is deliberately short. The reason it failed
# belongs in the server log, in full — a bare 502 with nothing behind it
# is undebuggable after the fact, which is how one real production
# failure became unexplainable (STATE.md).
log = logging.getLogger(__name__)

# gemini-2.5-flash is closed to new API keys and the 404 names this as the
# replacement. If this 404s later, GET /v1beta/models lists what the key can
# actually call — do not guess an id.
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
TIMEOUT_S = 60

# Gemini returns 503 "high demand" fairly often, and it clears on retry —
# seen repeatedly on 2026-09-05. Retry that status and nothing else. An
# invalid key, a 404 for a retired model or a 400 for a bad request will
# fail again identically, so retrying them only makes a teacher wait
# longer for the same message.
RETRY_STATUSES = (503,)
RETRIES = 2  # three attempts in total
BACKOFF_S = (1, 3)

SIMPLIFY_PROMPT = """You are helping a primary-school teacher in Jharkhand, India.

The children in the class are 6-10 years old. Hindi is the language of the
textbook, but it is NOT most of these children's mother tongue — they speak
Ho, Mundari, Kurukh, Sadri or Santali at home. The teacher needs the lesson
rewritten in Hindi that these children can actually follow.

Rewrite the sentence below. Keep it in Hindi. Apply all three of these:

1. VOCABULARY CONTROL — use everyday spoken words a village child already
   knows. Drop formal, literary or Sanskritised textbook words.
2. CULTURAL SUBSTITUTION — replace things outside a Jharkhand child's
   experience with local equivalents they see every day. For example, crops
   not grown in Jharkhand, unfamiliar city objects, or festivals from
   elsewhere. Keep the lesson's meaning; change the example.
3. SENTENCE SPLITTING — break long sentences into several short ones. Aim
   for about 5 words per sentence. One idea per sentence.

Return JSON only:
- "concept": one short sentence, in English, naming the idea the lesson is
  actually teaching. This is for the teacher, not the child.
- "adapted_hindi": array of short Hindi sentences replacing the original.
- "substitutions": array of the meaning-level swaps you made, each with
  "from" (original Hindi word), "to" (replacement Hindi word), and "why"
  (short English reason a teacher would accept). Only list real cultural or
  vocabulary swaps. Do not list ordinary rephrasing.

Original Hindi sentence:
{text}
"""

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "concept": {"type": "string"},
        "adapted_hindi": {"type": "array", "items": {"type": "string"}},
        "substitutions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "from": {"type": "string"},
                    "to": {"type": "string"},
                    "why": {"type": "string"},
                },
                "required": ["from", "to", "why"],
            },
        },
    },
    "required": ["concept", "adapted_hindi", "substitutions"],
}

# Devanagari danda, double danda, and the usual ASCII sentence enders.
_SENTENCE_SPLIT = re.compile(r"[।॥.!?]+")


# Long enough to see an upstream error object in full, short enough not
# to dump a whole model reply into the console on every failure. The
# teacher-facing messages reuse this with a much smaller limit, so there
# is one answer to "how much of an upstream body do we show" rather than
# a different inline slice at every raise.
_LOG_SNIPPET = 800
_CLIENT_SNIPPET = 200


def _snippet(text: str, limit: int = _LOG_SNIPPET) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit] + "... [truncated]"


def _upstream_error(label: str, status: int, body: str, retried: bool) -> RuntimeError:
    """Log the whole upstream failure, return the short version to raise.

    The console gets the full body — that is the entire reason this
    exists, since a 502 with a truncated message is what made one real
    production failure unexplainable. Both providers come through here,
    so the wording lives in one place instead of two that drift.
    """
    log.error("%s returned %s: %s", label, status, _snippet(body))
    attempts = f" after {RETRIES + 1} attempts" if retried else ""
    return RuntimeError(
        f"The simplification service returned {status}{attempts}. "
        f"{_snippet(body, _CLIENT_SNIPPET)}"
    )


def _words_per_sentence(sentences: list[str]) -> float:
    """Mean words per sentence, rounded to 1dp. 0.0 for no content."""
    counts = [len(s.split()) for s in sentences if s.strip()]
    return round(sum(counts) / len(counts), 1) if counts else 0.0


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in _SENTENCE_SPLIT.split(text) if s.strip()]


PROVIDERS = ("gemini", "openai_compatible")


@lru_cache(maxsize=1)
def _config() -> dict:
    provider = (os.getenv("LLM_PROVIDER") or "").strip().lower()
    key = (os.getenv("LLM_API_KEY") or "").strip()
    if not key:
        raise RuntimeError(
            "LLM_API_KEY is not set — the simplification step needs it. See "
            "backend/.env.example."
        )
    if provider not in PROVIDERS:
        raise RuntimeError(
            f"LLM_PROVIDER is '{provider or 'unset'}', but only "
            f"{' and '.join(PROVIDERS)} are implemented. Add the provider "
            "here in models/pedagogy.py rather than in a route."
        )

    config = {"provider": provider, "key": key}
    if provider == "openai_compatible":
        # Both are required: without them the SDK would silently fall back
        # to OpenAI's own host and a default model, which is a confusing
        # way to fail against somebody else's endpoint.
        for name in ("LLM_BASE_URL", "LLM_MODEL"):
            value = (os.getenv(name) or "").strip()
            if not value:
                raise RuntimeError(
                    f"{name} is not set. LLM_PROVIDER=openai_compatible needs "
                    "both LLM_BASE_URL and LLM_MODEL — see backend/.env.example."
                )
            config[name.lower()] = value
    return config


def _call_gemini(prompt: str, key: str) -> dict:
    """Return the model's parsed JSON object. Raises RuntimeError on failure."""
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _RESPONSE_SCHEMA,
            "temperature": 0.2,
        },
    }

    for attempt in range(RETRIES + 1):
        try:
            response = requests.post(
                GEMINI_URL.format(model=GEMINI_MODEL),
                headers={"x-goog-api-key": key, "Content-Type": "application/json"},
                json=payload,
                timeout=TIMEOUT_S,
            )
        except requests.Timeout:
            # Must not surface as a bare 500. A teacher standing in front
            # of a class needs to know it is worth trying again
            # (RULES.md §3).
            raise RuntimeError(
                f"The simplification service did not answer within {TIMEOUT_S} "
                "seconds. Check the connection and try again."
            )
        except requests.RequestException as e:
            raise RuntimeError(f"Could not reach the simplification service: {e}")

        if response.status_code not in RETRY_STATUSES or attempt == RETRIES:
            break
        # Kept even though nothing is raised: a retry that eventually
        # succeeds is otherwise completely invisible.
        log.warning(
            "%s returned %s on attempt %d/%d, retrying: %s",
            GEMINI_MODEL, response.status_code, attempt + 1, RETRIES + 1,
            _snippet(response.text),
        )
        time.sleep(BACKOFF_S[attempt])

    if not response.ok:
        # .text is a property and re-decodes the body on every access.
        raise _upstream_error(
            GEMINI_MODEL,
            response.status_code,
            response.text,
            response.status_code in RETRY_STATUSES,
        )

    try:
        raw = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(raw)
    except (KeyError, IndexError, ValueError) as e:
        raise RuntimeError(f"Could not read the simplification response: {e}")


def _call_openai_compatible(prompt: str, config: dict) -> dict:
    """Same contract as _call_gemini, against an OpenAI-shaped endpoint."""
    # Imported here so a gemini-only deployment does not need the SDK.
    import openai

    client = openai.OpenAI(
        api_key=config["key"],
        base_url=config["llm_base_url"],
        timeout=TIMEOUT_S,
        max_retries=0,  # retries are handled below, and only for 503
    )

    for attempt in range(RETRIES + 1):
        try:
            # No response_format={"type": "json_object"} on purpose. This
            # gateway accepts the parameter and then returns a literal
            # empty {} for some models (measured with claude-haiku-4.5 on
            # 2026-09-05) — worse than not sending it, because the call
            # succeeds and the content is gone. Without it the model
            # returns correct JSON, sometimes inside a markdown fence,
            # which is stripped below. The prompt already demands JSON.
            completion = client.chat.completions.create(
                model=config["llm_model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            break
        except openai.APIStatusError as e:
            # Same rule as the gemini path: retry only the status that
            # clears on its own. A bad key or an unknown model fails
            # identically every time.
            if e.status_code in RETRY_STATUSES and attempt < RETRIES:
                log.warning(
                    "%s returned %s on attempt %d/%d, retrying: %s",
                    config["llm_model"], e.status_code, attempt + 1,
                    RETRIES + 1, _snippet(str(e)),
                )
                time.sleep(BACKOFF_S[attempt])
                continue
            raise _upstream_error(
                f"{config['llm_model']} at {config['llm_base_url']}",
                e.status_code,
                str(e),
                e.status_code in RETRY_STATUSES,
            )
        except openai.APITimeoutError:
            raise RuntimeError(
                f"The simplification service did not answer within {TIMEOUT_S} "
                "seconds. Check the connection and try again."
            )
        except openai.APIConnectionError as e:
            raise RuntimeError(f"Could not reach the simplification service: {e}")

    content = (completion.choices[0].message.content or "").strip()
    if not content:
        raise RuntimeError("The simplification service returned an empty reply.")

    # Models routinely wrap JSON in a markdown fence. Strip it rather than
    # failing on it.
    if content.startswith("```"):
        content = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", content).strip()

    # Take the first JSON object and ignore anything after it. Models
    # routinely append a sentence of explanation, or emit the object then
    # keep talking; json.loads() rejects the whole reply for that
    # ("Extra data: line 17 column 1"), which throws away a perfectly good
    # answer. Seen intermittently with claude-haiku-4.5 on 2026-09-05.
    start = content.find("{")
    if start == -1:
        raise RuntimeError(
            "The simplification service replied without any JSON: "
            f"{_snippet(content, _CLIENT_SNIPPET)}"
        )
    try:
        result, _ = json.JSONDecoder().raw_decode(content[start:])
        return result
    except ValueError as e:
        raise RuntimeError(f"Could not read the simplification response: {e}")


def simplify(text: str) -> dict:
    """Return the DATA_DICTIONARY.md §4 /simplify shape. Raises on failure."""
    if not text.strip():
        raise ValueError("Nothing to simplify — the text was empty.")

    config = _config()
    prompt = SIMPLIFY_PROMPT.format(text=text.strip())
    if config["provider"] == "gemini":
        result = _call_gemini(prompt, config["key"])
    else:
        result = _call_openai_compatible(prompt, config)

    adapted = [s.strip() for s in result.get("adapted_hindi", []) if s.strip()]
    if not adapted:
        raise RuntimeError(
            "The simplification came back with no sentences — try a shorter "
            "or clearer sentence."
        )

    # Readability is measured here, not asked of the model. A model counting
    # its own words is a claim; this is a measurement.
    return {
        "concept": result.get("concept", ""),
        "adapted_hindi": adapted,
        "substitutions": result.get("substitutions", []),
        "readability": {
            "before_wps": _words_per_sentence(_split_sentences(text)),
            "after_wps": _words_per_sentence(adapted),
        },
    }
