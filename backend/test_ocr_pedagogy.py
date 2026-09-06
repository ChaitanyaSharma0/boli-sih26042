"""Phase 3 verification — run with the venv python from backend/.

    ./.venv/Scripts/python.exe test_ocr_pedagogy.py

Runs the front half of the teacher's flow end to end: an image of a
Hindi textbook line goes in, adapted Hindi sentences come out.

The test renders its own image rather than carrying a photo fixture in
the repo, so it works on a fresh clone. That means it tests clean
rendered text, not a real phone photo of a real page — a photo will read
worse, which is exactly what /ocr's "confidence": "low" flag is for.

Needs Tesseract with the `hin` pack, and LLM_API_KEY/LLM_PROVIDER set.
"""

import io
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from main import app  # noqa: E402

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

# TestClient without a context manager: skips the lifespan model warmup,
# which nothing in this phase needs.
client = TestClient(app)

TEXTBOOK_LINE = "किसान खेत में गेहूँ उगाता है"
DEVANAGARI_FONTS = [
    r"C:\Windows\Fonts\Nirmala.ttc",
    r"C:\Windows\Fonts\mangal.ttf",
    "/usr/share/fonts/truetype/lohit-devanagari/Lohit-Devanagari.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
]


def render_textbook_line(text: str) -> bytes:
    """A clean black-on-white render, standing in for a photographed page."""
    path = next((p for p in DEVANAGARI_FONTS if os.path.exists(p)), None)
    if path is None:
        raise RuntimeError(
            "No Devanagari font found to render the test image. Add one to "
            "DEVANAGARI_FONTS."
        )
    font = ImageFont.truetype(path, 48)
    image = Image.new("RGB", (1100, 140), "white")
    ImageDraw.Draw(image).text((30, 35), text, fill="black", font=font)
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_ocr_reads_hindi() -> str:
    png = render_textbook_line(TEXTBOOK_LINE)
    r = client.post("/ocr", files={"file": ("lesson.png", png, "image/png")})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["confidence"] in ("ok", "low"), body
    assert body["text"].strip(), "OCR returned nothing at all"

    # Deliberately not asserting an exact match. Tesseract reorders some
    # Devanagari vowel signs — किसान reliably comes back as कस्िान, because
    # the ि matra is drawn before its consonant but encoded after it. The
    # rest of the line reads correctly. That is why /ocr returns the text
    # with a confidence flag instead of blocking: the teacher fixes the odd
    # word on screen 1. Assert on the words OCR can actually promise.
    for word in ("खेत", "उगाता"):
        assert word in body["text"], f"OCR did not find {word} in: {body['text']!r}"
    assert len(body["text"].split()) >= 5, body["text"]
    print(f"ocr      : {body['text']}   (confidence={body['confidence']})")
    return body["text"]


def test_simplify(text: str):
    r = client.post("/simplify", json={"text": text})
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["adapted_hindi"], "no adapted sentences came back"
    assert isinstance(body["adapted_hindi"], list)
    assert body["concept"].strip(), "no concept came back"
    for key in ("before_wps", "after_wps"):
        assert isinstance(body["readability"][key], (int, float)), body["readability"]
    for sub in body["substitutions"]:
        assert {"from", "to", "why"} <= sub.keys(), sub

    print(f"concept  : {body['concept']}")
    for s in body["adapted_hindi"]:
        print(f"adapted  : {s}")
    for sub in body["substitutions"]:
        print(f"swap     : {sub['from']} -> {sub['to']}  ({sub['why']})")
    print(
        f"readable : {body['readability']['before_wps']} words/sentence -> "
        f"{body['readability']['after_wps']}"
    )
    return body


def test_empty_text_is_rejected():
    assert client.post("/simplify", json={"text": "   "}).status_code == 400


def test_network_failure_is_readable_not_a_500():
    """A timeout reaching the LLM must not surface as a bare 500.

    This was real: a ReadTimeout is not a RuntimeError, so it escaped the
    wrapper and the teacher got "Internal Server Error" with nothing to
    act on. RULES.md §3 — fail loudly with a message a teacher can use.
    """
    import requests

    from models import pedagogy

    original = pedagogy.requests.post

    def timeout(*args, **kwargs):
        raise requests.Timeout("simulated")

    with force_provider(**GEMINI_ENV):
        pedagogy.requests.post = timeout
        try:
            r = client.post("/simplify", json={"text": "किसान खेत में गेहूँ उगाता है"})
            assert r.status_code == 502, f"expected 502, got {r.status_code}"
            assert "try again" in r.json()["detail"].lower(), r.json()
            print(f"timeout  : {r.status_code} — {r.json()['detail']}")
        finally:
            pedagogy.requests.post = original


class _FakeResponse:
    def __init__(self, status, body=""):
        self.status_code = status
        self.ok = 200 <= status < 300
        self.text = body

    def json(self):
        import json as _json

        return _json.loads(self.text)


from contextlib import contextmanager  # noqa: E402


@contextmanager
def force_provider(**env):
    """Pin LLM_* for one test and clear the cached config either side.

    _config() is lru_cached, so without the clears a test would either
    reuse .env's real provider or leak its own into the next test. The
    gemini-path tests below patch requests.post, which the
    openai_compatible path never calls — so without this pin they would
    quietly stop testing anything the moment .env switched provider.
    """
    from models import pedagogy

    keys = ("LLM_PROVIDER", "LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL")
    saved = {k: os.environ.get(k) for k in keys}
    try:
        for k in keys:
            os.environ.pop(k, None)
        os.environ.update(env)
        pedagogy._config.cache_clear()
        yield pedagogy
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        pedagogy._config.cache_clear()


GEMINI_ENV = {"LLM_PROVIDER": "gemini", "LLM_API_KEY": "test-key"}
OPENAI_ENV = {
    "LLM_PROVIDER": "openai_compatible",
    "LLM_API_KEY": "test-key",
    "LLM_BASE_URL": "https://example.invalid/v1",
    "LLM_MODEL": "test-model",
}


def _with_fake_post(responses):
    """Replace requests.post with one that returns `responses` in order."""
    from models import pedagogy

    calls = []

    def fake(*args, **kwargs):
        calls.append(1)
        return responses[min(len(calls) - 1, len(responses) - 1)]

    original = pedagogy.requests.post
    pedagogy.requests.post = fake
    return pedagogy, original, calls


def test_503_is_retried_and_can_succeed():
    """Gemini's "high demand" 503 clears on retry — seen repeatedly."""
    import json as _json

    good = _FakeResponse(
        200,
        _json.dumps(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": _json.dumps(
                                        {
                                            "concept": "c",
                                            "adapted_hindi": ["किसान काम करता है।"],
                                            "substitutions": [],
                                        }
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        ),
    )
    pedagogy, original, calls = _with_fake_post(
        [_FakeResponse(503, "busy"), _FakeResponse(503, "busy"), good]
    )
    pedagogy.BACKOFF_S = (0, 0)  # do not actually wait in a test
    try:
        with force_provider(**GEMINI_ENV):
            r = client.post("/simplify", json={"text": "किसान खेत में काम करता है।"})
            assert r.status_code == 200, r.text
            assert len(calls) == 3, f"expected 3 attempts, made {len(calls)}"
            print(f"503      : retried {len(calls) - 1}x then succeeded")
    finally:
        pedagogy.requests.post = original
        pedagogy.BACKOFF_S = (1, 3)


def test_503_that_never_clears_gives_up():
    pedagogy, original, calls = _with_fake_post([_FakeResponse(503, "busy")])
    pedagogy.BACKOFF_S = (0, 0)
    try:
        with force_provider(**GEMINI_ENV):
            r = client.post("/simplify", json={"text": "किसान खेत में काम करता है।"})
            assert r.status_code == 502, r.status_code
            assert len(calls) == 3, f"expected 3 attempts, made {len(calls)}"
            assert "after 3 attempts" in r.json()["detail"], r.json()
            print(f"503      : gave up after {len(calls)} attempts, message says so")
    finally:
        pedagogy.requests.post = original
        pedagogy.BACKOFF_S = (1, 3)


def test_client_errors_are_not_retried():
    """An invalid key or a retired model fails identically every time.

    Retrying those only makes a teacher wait longer for the same message,
    so each must cost exactly one call.
    """
    for status, label in ((400, "invalid API key"), (404, "retired model")):
        pedagogy, original, calls = _with_fake_post([_FakeResponse(status, "nope")])
        try:
            with force_provider(**GEMINI_ENV):
                r = client.post("/simplify", json={"text": "किसान खेत में काम करता है।"})
                assert r.status_code == 502, r.status_code
                assert len(calls) == 1, f"{label}: retried {len(calls)} times, expected 1"
                assert "attempts" not in r.json()["detail"], r.json()
        finally:
            pedagogy.requests.post = original
        print(f"{status}      : {label} failed fast, 1 call, no retry")


# --- the openai_compatible provider ------------------------------------
# The gateway is faked. These pin the behaviour that actually bit us:
# response_format is not used, a fenced reply still parses, and only 503
# is retried.


class _FakeOpenAIModule:
    """Stands in for the openai SDK, with the exception types we catch."""

    class APIStatusError(Exception):
        def __init__(self, status_code):
            super().__init__(f"status {status_code}")
            self.status_code = status_code

    class APITimeoutError(Exception):
        pass

    class APIConnectionError(Exception):
        pass

    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []
        self.kwargs_seen = []

    # openai.OpenAI(...) -> client
    def OpenAI(self, **kwargs):  # noqa: N802 - mirrors the SDK's name
        module = self

        class Completions:
            def create(self, **kw):
                module.calls.append(kw.get("model"))
                module.kwargs_seen.append(kw)
                reply = module.replies[min(len(module.calls) - 1, len(module.replies) - 1)]
                if isinstance(reply, Exception):
                    raise reply
                return _FakeCompletion(reply)

        class Chat:
            completions = Completions()

        class Client:
            chat = Chat()

        return Client()


class _FakeCompletion:
    def __init__(self, content):
        self.choices = [
            type("C", (), {"message": type("M", (), {"content": content})()})()
        ]


def _run_with_fake_openai(fake, text="किसान खेत में काम करता है।"):
    import sys

    saved = sys.modules.get("openai")
    sys.modules["openai"] = fake
    try:
        with force_provider(**OPENAI_ENV):
            return client.post("/simplify", json={"text": text})
    finally:
        if saved is None:
            sys.modules.pop("openai", None)
        else:
            sys.modules["openai"] = saved


GOOD_JSON = (
    '{"concept": "c", "adapted_hindi": ["किसान काम करता है।"], "substitutions": []}'
)


def test_openai_compatible_parses_a_fenced_reply():
    """Models wrap JSON in a markdown fence. That must not be a failure."""
    fake = _FakeOpenAIModule(["```json\n" + GOOD_JSON + "\n```"])
    r = _run_with_fake_openai(fake)
    assert r.status_code == 200, r.text
    assert r.json()["adapted_hindi"] == ["किसान काम करता है।"], r.json()
    print("openai   : fenced JSON parsed, 1 call")


def test_openai_compatible_ignores_text_after_the_json():
    """Models append explanations. json.loads() would reject the lot.

    Seen live with claude-haiku-4.5: a valid object followed by prose,
    which failed as "Extra data: line 17 column 1" and threw away a good
    answer. The first JSON object wins; the rest is ignored.
    """
    for reply in (
        GOOD_JSON + "\n\nI simplified the vocabulary for young readers.",
        "Here is the JSON you asked for:\n" + GOOD_JSON,
        "```json\n" + GOOD_JSON + "\n```\nHope this helps!",
    ):
        r = _run_with_fake_openai(_FakeOpenAIModule([reply]))
        assert r.status_code == 200, (reply[:40], r.text)
        assert r.json()["adapted_hindi"] == ["किसान काम करता है।"]
    print("openai   : leading and trailing prose around the JSON ignored")


def test_openai_compatible_reply_without_json_is_a_clear_error():
    r = _run_with_fake_openai(_FakeOpenAIModule(["I cannot help with that."]))
    assert r.status_code == 502, r.status_code
    assert "without any JSON" in r.json()["detail"], r.json()
    print("openai   : a reply with no JSON at all fails with a clear message")


def test_openai_compatible_does_not_send_response_format():
    """Measured 2026-09-05: this gateway returns a literal empty {} for
    some models when response_format is sent. Sending it looks harmless
    and silently empties the reply, so it must stay unsent."""
    fake = _FakeOpenAIModule([GOOD_JSON])
    r = _run_with_fake_openai(fake)
    assert r.status_code == 200, r.text
    assert "response_format" not in fake.kwargs_seen[0], fake.kwargs_seen[0]
    assert fake.kwargs_seen[0]["model"] == "test-model"
    print("openai   : response_format not sent, model slug from LLM_MODEL")


def test_openai_compatible_retries_503_only():
    busy = _FakeOpenAIModule.APIStatusError(503)
    fake = _FakeOpenAIModule([busy, busy, GOOD_JSON])
    from models import pedagogy

    saved, pedagogy.BACKOFF_S = pedagogy.BACKOFF_S, (0, 0)
    try:
        r = _run_with_fake_openai(fake)
        assert r.status_code == 200, r.text
        assert len(fake.calls) == 3, fake.calls
        print(f"openai   : 503 retried {len(fake.calls) - 1}x then succeeded")

        # 429 means "add a card", which retrying will never fix.
        quota = _FakeOpenAIModule.APIStatusError(429)
        fake429 = _FakeOpenAIModule([quota])
        r = _run_with_fake_openai(fake429)
        assert r.status_code == 502, r.status_code
        assert len(fake429.calls) == 1, f"429 retried {len(fake429.calls)} times"
        print("openai   : 429 failed fast, 1 call, no retry")
    finally:
        pedagogy.BACKOFF_S = saved


def test_openai_compatible_requires_base_url_and_model():
    from models import pedagogy

    for missing in ("LLM_BASE_URL", "LLM_MODEL"):
        env = {k: v for k, v in OPENAI_ENV.items() if k != missing}
        with force_provider(**env):
            try:
                pedagogy._config()
                raise AssertionError(f"{missing} missing was accepted")
            except RuntimeError as e:
                assert missing in str(e), str(e)
    print("openai   : missing LLM_BASE_URL / LLM_MODEL each rejected by name")


if __name__ == "__main__":
    ocr_text = test_ocr_reads_hindi()
    test_simplify(ocr_text)
    test_empty_text_is_rejected()
    test_network_failure_is_readable_not_a_500()
    test_503_is_retried_and_can_succeed()
    test_503_that_never_clears_gives_up()
    test_client_errors_are_not_retried()
    test_openai_compatible_parses_a_fenced_reply()
    test_openai_compatible_ignores_text_after_the_json()
    test_openai_compatible_reply_without_json_is_a_clear_error()
    test_openai_compatible_does_not_send_response_format()
    test_openai_compatible_retries_503_only()
    test_openai_compatible_requires_base_url_and_model()
    print("\nPASS")
