// Fetch wrappers for the BOLI backend. The frontend never calls a model
// directly — the gated HF token must never reach the browser
// (ARCHITECTURE.md §1).

import { toAsrWav } from "./wav.js";

// import.meta.env only exists under Vite; the node tests import this file too.
const BASE = import.meta.env?.VITE_API_BASE ?? "http://127.0.0.1:8000";

// FastAPI puts its error message in `detail`. Surface that to the teacher
// rather than a generic failure — the backend's messages are written to be
// read by one (RULES.md §3).
async function detail(response) {
  try {
    const body = await response.json();
    return body.detail ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

// fetch rejects with "Failed to fetch" when the server is unreachable,
// which tells a teacher nothing. Say what happened instead.
const UNREACHABLE = "Couldn't reach the server. Check it is running and try again.";

async function send(path, init) {
  try {
    return await fetch(`${BASE}${path}`, init);
  } catch {
    throw new Error(UNREACHABLE);
  }
}

async function postJson(path, body) {
  const response = await send(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await detail(response));
  return response.json();
}

// The capability list. The frontend renders what each language can and
// cannot do from this response and never hardcodes it (RULES.md §5), so a
// backend change to a language's capability needs no frontend change.
export async function languages() {
  const response = await send("/languages");
  if (!response.ok) throw new Error(await detail(response));
  return response.json(); // [{ code, name, translation, tts, note }]
}

export async function ocr(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await send("/ocr", { method: "POST", body: form });
  if (!response.ok) throw new Error(await detail(response));
  return response.json(); // { text, confidence }
}

// Hindi in, simpler Hindi out. Supports grade 1-5 (defaults to Class 2).
export function simplify(text, grade = 2) {
  return postJson("/simplify", { text, grade });
  // { concept, adapted_hindi, substitutions, readability }
}

// Chapter extraction: upload a PDF or TXT chapter file to extract sentences.
export async function extractChapter(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await send("/chapter/extract", { method: "POST", body: form });
  if (!response.ok) throw new Error(await detail(response));
  return response.json(); // { filename, sentences: [...], count }
}

// ASR: speech-to-text via Meta MMS Hindi ASR.
export async function transcribeAudio(audioBlob) {
  // Browsers record WebM or MP4, never WAV; the backend reads WAV only.
  const wav = audioBlob.type === "audio/wav" ? audioBlob : await toAsrWav(audioBlob);
  const form = new FormData();
  form.append("file", wav, "recording.wav");
  const response = await send("/asr", { method: "POST", body: form });
  if (!response.ok) throw new Error(await detail(response));
  return response.json(); // { text }
}

// Santali only. The backend returns 501 for any other target and this
// wrapper does nothing to soften that — see translateTargetFor().
export function translate(text, target) {
  return postJson("/translate", { text, target });
  // { translated, target, script_contamination }
}

// One row per teacher submission. Called before the rest of the sequence,
// so a correction has a real lesson to point at (ARCHITECTURE.md §3).
export function createLesson({ sourceText, sourceType, languages }) {
  return postJson("/lessons", {
    source_text: sourceText,
    source_type: sourceType,
    languages_requested: languages,
  }); // { id }
}

// /speak answers in one of two shapes, and the difference matters:
// either wav bytes, or a refusal saying the text is not in the curated
// phrase bank. Collapsing those two into one "result" is how a caller
// would end up rendering silence as success (ARCHITECTURE.md §3).
export async function speak(text, lang) {
  const response = await send("/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  });
  if (!response.ok) throw new Error(await detail(response));

  const type = response.headers.get("content-type") ?? "";
  if (type.startsWith("audio/")) {
    return {
      kind: "audio",
      blob: await response.blob(),
      targetText: spokenPhrase(response.headers), // null if not a bank hit
    };
  }
  const body = await response.json();
  return { kind: "phrase_bank_only", ...body }; // { reason, options: [...] }
}

// On a phrase-bank hit /speak names the phrase it actually spoke:
// X-Target-Text is base64 of its UTF-8 (header values are Latin-1 only).
// atob gives one char per byte, so the bytes are decoded as UTF-8 here —
// reading atob's output directly would turn Odia or Devanagari into
// mojibake. Anything but an explicit match returns null, and the caller
// falls back to naming the Hindi it sent.
export function spokenPhrase(headers) {
  if (headers.get("X-Phrase-Bank-Match") !== "true") return null;
  const encoded = headers.get("X-Target-Text");
  if (!encoded) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes) || null;
  } catch {
    return null;
  }
}

// Writes one row. Triggers no retraining and changes nothing the teacher
// sees next (PRD.md §3).
export function correct({ lessonId, original, corrected, lang }) {
  return postJson("/correct", {
    lesson_id: lessonId,
    original,
    corrected,
    lang,
  });
}
