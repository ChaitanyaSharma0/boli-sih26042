// Run: npm test
//
// The offline pack leaves the app and gets shared between classrooms, so it
// must carry the honesty boundary on its own (PRD.md §4, RULES.md §2).
// These tests call the real builders in src/offlinePack.js — the earlier
// pack test built its own mock zip and never exercised them, which is how
// the pack shipped presenting Hindi as spoken audio with no capability
// labels at all.

import assert from "node:assert/strict";
import { test } from "node:test";

import { phraseBankNote } from "../src/capability.js";
import { buildPackHtml, buildPackSummary, packScopeNote } from "../src/offlinePack.js";

const HINDI = "पानी हमारा जीवन है";

const LANGUAGES = [
  { code: "hoc", name: "Ho", translation: "phrase_bank", tts: "full", note: null },
  { code: "kru", name: "Kurukh", translation: "phrase_bank", tts: "full", note: null },
  {
    code: "sat",
    name: "Santali",
    translation: "full",
    tts: "none",
    note: "No TTS checkpoint exists anywhere for Santali.",
  },
];

const RESULTS = [
  {
    sentenceIndex: 0,
    sourceText: HINDI,
    adapted: {
      concept: "Water keeps us alive.",
      adapted_hindi: ["पानी जीवन है।"],
      substitutions: [],
    },
    translations: [
      {
        code: "sat",
        name: "Santali",
        sentence: "पानी जीवन है।",
        translated: "ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱠᱟᱱᱟ ᱾",
        contaminated: true,
      },
    ],
    audio: {
      // A phrase-bank hit: /speak only returns bytes, so the text held is
      // the Hindi that was sent, not the phrase that was spoken.
      hoc: { kind: "audio", text: HINDI, textIsTarget: false },
      kru: { kind: "phrase_bank_only", reason: "Not a phrase-bank phrase.", options: [] },
    },
  },
];

const pack = { results: RESULTS, languages: LANGUAGES, grade: 2 };

test("phrase-bank audio is never presented as the Hindi it was asked with", () => {
  const html = buildPackHtml(pack);
  assert.ok(
    html.includes(`The Ho phrase for ${HINDI}`),
    "Ho audio must be described as 'The Ho phrase for <hindi>'",
  );
  // The old pack rendered exactly this: the Hindi as the audio's text.
  assert.ok(!/Audio \(hoc\)/.test(html), "the old 'Audio (hoc): <hindi>' label is back");
  assert.ok(!html.includes(`<em>${HINDI}</em>`), "Hindi is being presented as spoken audio");
});

test("every language block carries its capability label and edge", () => {
  const html = buildPackHtml(pack);
  assert.ok(html.includes('class="lang cap-phrase_bank"'), "phrase-bank edge missing");
  assert.ok(html.includes('class="lang cap-full"'), "AI-translation edge missing");
  assert.equal(
    (html.match(/class="lang cap-phrase_bank"/g) || []).length,
    2,
    "Ho and Kurukh must both be labelled phrase bank",
  );
  assert.ok(html.includes("Phrase bank only"), "Phrase bank only badge missing");
  assert.ok(html.includes("AI translation"), "AI translation badge missing");
  // Colour is reinforcement: dashed amber for the bank, solid green for AI.
  assert.match(html, /\.cap-phrase_bank\s*\{[^}]*dashed #B06A00/);
  assert.match(html, /\.cap-full\s*\{[^}]*solid #1B6B45/);
});

test("the pack states pending validation, on its own, with no app around it", () => {
  const html = buildPackHtml(pack);
  assert.ok(html.includes(phraseBankNote(LANGUAGES[0])), "the phrase-bank note is missing");
  assert.match(html, /pending validation/i);
});

test("Santali gets no audio in the pack and says it is text only", () => {
  const html = buildPackHtml(pack);
  assert.ok(!html.includes("sentence_1_sat.wav"), "Santali must never get an audio player");
  assert.ok(html.includes("This is text only."));
  assert.ok(html.includes("wrong script"), "the contamination warning is missing");
});

test("the summary text carries the same labels and wording", () => {
  const summary = buildPackSummary(pack);
  assert.ok(summary.includes("[Ho, Phrase bank only] audio:"));
  assert.ok(summary.includes(`The Ho phrase for ${HINDI}`));
  assert.ok(summary.includes(phraseBankNote(LANGUAGES[0])));
  assert.ok(summary.includes("[Santali, AI translation]:"));
  assert.match(summary, /pending validation/i);
});

test("a spoken phrase whose text really is the target is shown as-is", () => {
  const html = buildPackHtml({
    ...pack,
    results: [
      {
        ...RESULTS[0],
        audio: { hoc: { kind: "audio", text: "ଦା ଆଲେ ଜୀଉ ତାନା", textIsTarget: true } },
      },
    ],
  });
  assert.ok(html.includes("<p>ଦା ଆଲେ ଜୀଉ ତାନା</p>"));
  assert.ok(!html.includes("The Ho phrase for ଦା"));
});

test("a pack of checked languages says so, and only then", () => {
  const checked = LANGUAGES.map((l) => ({ ...l, phrases_verified: l.translation === "phrase_bank" }));
  const html = buildPackHtml({ ...pack, languages: checked });
  assert.match(html, /checked by native speakers/i);
  assert.doesNotMatch(html, /pending validation/i);
  // Still not translation, even when checked.
  assert.match(html, /not translated from your sentence/i);

  const mixed = checked.map((l) => (l.code === "kru" ? { ...l, phrases_verified: false } : l));
  assert.match(packScopeNote(mixed), /pending validation/i);
});
