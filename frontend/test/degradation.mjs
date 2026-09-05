// Phase 8.5 verification — run from frontend/:
//
//     node test/degradation.mjs                          (localhost:8000)
//     node test/degradation.mjs https://<space>.hf.space  (deployed)
//
// Replays the Result screen's request sequence, in the same order, using
// the same capability module the screen imports, and asserts that a
// broken /simplify does not take the other languages with it.
//
// This needs /simplify to actually be failing. Locally, start the backend
// with an invalid key:
//
//     LLM_API_KEY=INVALID DATABASE_PATH=/tmp/t.sqlite \
//       ./.venv/Scripts/python.exe -m uvicorn main:app --port 8000
//
// Against a deployed Space, temporarily set the LLM_API_KEY secret to an
// invalid value, restart, run this, then put the real key back. There is
// no way to induce the failure from outside, and asserting the property
// without inducing it would not be a test.

import assert from "node:assert/strict";
import {
  speaksWithoutPedagogy,
  translateTargetFor,
} from "../src/capability.js";

const BASE = (process.argv[2] ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const HINDI = "पानी हमारा जीवन है";
const SELECTED = ["sat", "hoc", "unr", "kru", "sck"];

console.log(`target: ${BASE}\n`);

const postJson = (path, body) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const all = await (await fetch(BASE + "/languages")).json();
const picked = all.filter((l) => SELECTED.includes(l.code));

const lesson = await (
  await postJson("/lessons", {
    source_text: HINDI,
    source_type: "typed",
    languages_requested: SELECTED,
  })
).json();
console.log("0. POST /lessons -> id", lesson.id);

// 1. Speak the pedagogy-independent languages FIRST — this ordering is
// the fix: they must not queue behind a third-party call they never used.
const audio = {};
for (const language of picked.filter(speaksWithoutPedagogy)) {
  const r = await postJson("/speak", { text: HINDI, lang: language.code });
  const type = r.headers.get("content-type") ?? "";
  audio[language.code] = type.startsWith("audio/")
    ? { ok: true, bytes: (await r.blob()).size }
    : { ok: false, body: await r.json() };
  const a = audio[language.code];
  console.log(
    `1. ${language.name.padEnd(8)} -> ${a.ok ? `audio/wav, ${a.bytes} bytes` : "phrase-bank refusal"}`,
  );
}

// 2. Simplify — expected to fail in this run, and expected not to be fatal.
let simplified = null;
let simplifyError = "";
const sr = await postJson("/simplify", { text: HINDI });
if (sr.ok) {
  simplified = await sr.json();
  console.log("2. POST /simplify -> 200");
} else {
  simplifyError = (await sr.json()).detail;
  console.log(`2. POST /simplify -> HTTP ${sr.status} (the induced failure)`);
}

// 3. Translate only if there is adapted text. Translating the
// unsimplified sentence instead would produce exactly the broken output
// the pedagogy step exists to prevent.
const translated = [];
if (simplified) {
  for (const language of picked) {
    const target = translateTargetFor(language);
    if (!target) continue;
    for (const sentence of simplified.adapted_hindi) {
      translated.push(
        await (await postJson("/translate", { text: sentence, target })).json(),
      );
    }
  }
} else {
  console.log("3. /translate skipped — no adapted text to translate");
}

console.log("\n--- what the teacher sees ---");
for (const language of picked) {
  const a = audio[language.code];
  if (a?.ok) console.log(`  ${language.name.padEnd(8)}: playable audio (${a.bytes} bytes)`);
  else if (a) console.log(`  ${language.name.padEnd(8)}: phrase-bank refusal with options`);
  else if (simplifyError) console.log(`  ${language.name.padEnd(8)}: inline error, scoped to this language`);
  else console.log(`  ${language.name.padEnd(8)}: translated`);
}

assert.ok(
  simplifyError,
  "/simplify succeeded, so this run proves nothing — induce the failure first " +
    "(see the comment at the top of this file)",
);
for (const code of ["hoc", "unr", "kru", "sck"]) {
  assert.ok(audio[code], `${code} produced no /speak result while /simplify was failing`);
  assert.equal(audio[code].ok, true, `${code} should still play audio when the LLM is down`);
}
assert.equal(translated.length, 0, "nothing should have been translated");

console.log(
  "\nPASS — /simplify failed, all four phrase-bank languages still returned\n" +
    "playable audio, and only Santali is left without a result.",
);
