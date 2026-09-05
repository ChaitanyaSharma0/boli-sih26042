// Fetch wrappers for the BOLI backend. The frontend never calls a model
// directly — the gated HF token must never reach the browser
// (ARCHITECTURE.md §1).

const BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

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

async function postJson(path, body) {
  const response = await fetch(`${BASE}${path}`, {
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
  const response = await fetch(`${BASE}/languages`);
  if (!response.ok) throw new Error(await detail(response));
  return response.json(); // [{ code, name, translation, tts, note }]
}

export async function ocr(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${BASE}/ocr`, { method: "POST", body: form });
  if (!response.ok) throw new Error(await detail(response));
  return response.json(); // { text, confidence }
}

// Hindi in, simpler Hindi out. Never crosses a language boundary.
export function simplify(text) {
  return postJson("/simplify", { text });
  // { concept, adapted_hindi, substitutions, readability }
}

// Santali only. The backend returns 501 for any other target and this
// wrapper does nothing to soften that — see translateTargetFor().
export function translate(text, target) {
  return postJson("/translate", { text, target });
  // { translated, target }
}

// /speak answers in one of two shapes, and the difference matters:
// either wav bytes, or a refusal saying the text is not in the curated
// phrase bank. Collapsing those two into one "result" is how a caller
// would end up rendering silence as success (ARCHITECTURE.md §3).
export async function speak(text, lang) {
  const response = await fetch(`${BASE}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  });
  if (!response.ok) throw new Error(await detail(response));

  const type = response.headers.get("content-type") ?? "";
  if (type.startsWith("audio/")) {
    return { kind: "audio", blob: await response.blob() };
  }
  const body = await response.json();
  return { kind: "phrase_bank_only", ...body }; // { reason, options: [...] }
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
