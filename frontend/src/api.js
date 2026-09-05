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
