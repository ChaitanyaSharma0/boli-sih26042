// Run: npm test   (node's built-in runner, no framework)
//
// These are the claims the language screen makes about what each language
// can do. They are the UI half of PRD.md §4's boundary, so a change that
// quietly softens one should fail here rather than ship.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GROUPS,
  capabilityBadge,
  describeCapability,
  groupLanguages,
} from "../src/capability.js";

// Exactly what GET /languages returns today, copied from a live response.
const LIVE = [
  {
    code: "sat",
    name: "Santali",
    translation: "full",
    tts: "none",
    note: "No TTS checkpoint exists anywhere for Santali.",
  },
  { code: "hoc", name: "Ho", translation: "phrase_bank", tts: "full", note: null },
  { code: "unr", name: "Mundari", translation: "phrase_bank", tts: "full", note: null },
  { code: "kru", name: "Kurukh", translation: "phrase_bank", tts: "full", note: null },
  { code: "sck", name: "Sadri", translation: "phrase_bank", tts: "full", note: null },
];

test("every capability combination produces real text", () => {
  for (const translation of ["full", "phrase_bank", "none"]) {
    for (const tts of ["full", "phrase_bank", "none"]) {
      const text = describeCapability({ translation, tts });
      assert.ok(
        text && text.trim().length > 10,
        `no description for translation=${translation} tts=${tts}; blank space ` +
          `on this screen reads as "no limitations"`,
      );
      assert.ok(capabilityBadge({ translation }).trim(), "empty badge");
    }
  }
});

test("phrase-bank languages never claim to be translated", () => {
  for (const tts of ["full", "none"]) {
    const text = describeCapability({ translation: "phrase_bank", tts });
    assert.match(
      text,
      /not live translation/,
      "a phrase-bank language must say so in words, not only by grouping",
    );
  }
  assert.equal(capabilityBadge({ translation: "phrase_bank" }), "Phrase bank only");
});

test("Santali is described as translated but voiceless", () => {
  const sat = LIVE.find((l) => l.code === "sat");
  const text = describeCapability(sat);
  assert.match(text, /translation/i);
  assert.match(text, /no voice/i, "Santali has no TTS checkpoint and must say so");
});

test("the live response splits into exactly two groups", () => {
  const groups = groupLanguages(LIVE);
  assert.deepEqual(
    groups.map((g) => g.key),
    ["full", "phrase_bank"],
    "real translation must be a separate group from the phrase bank",
  );
  assert.deepEqual(groups[0].items.map((l) => l.code), ["sat"]);
  assert.deepEqual(groups[1].items.map((l) => l.code), [
    "hoc",
    "unr",
    "kru",
    "sck",
  ]);
});

test("the phrase-bank group still says validation is pending", () => {
  const blurb = GROUPS.find((g) => g.key === "phrase_bank").blurb;
  assert.match(
    blurb,
    /pending validation/i,
    "PRD.md §4: do not remove or soften 'pending validation' anywhere in the UI",
  );
  assert.match(blurb, /no translation model exists/i);
});

test("an unknown capability gets its own group instead of vanishing", () => {
  const groups = groupLanguages([
    ...LIVE,
    { code: "xxx", name: "Future", translation: "experimental", tts: "none" },
  ]);
  assert.deepEqual(groups.map((g) => g.key), [
    "full",
    "phrase_bank",
    "experimental",
  ]);
});

test("empty groups are not rendered", () => {
  const onlyBank = LIVE.filter((l) => l.translation === "phrase_bank");
  assert.deepEqual(groupLanguages(onlyBank).map((g) => g.key), ["phrase_bank"]);
});
