// Run: npm test   (node's built-in runner, no framework)
//
// These are the claims the language screen makes about what each language
// can do. They are the UI half of PRD.md §4's boundary, so a change that
// quietly softens one should fail here rather than ship.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SANTALI_TARGET,
  VERIFIED_CONTRAST,
  capabilityBadge,
  describeCapability,
  groupLanguages,
  nativeName,
  phraseBankNote,
  speaksWithoutPedagogy,
  translateTargetFor,
} from "../src/capability.js";

// Exactly what GET /languages returns today, copied from a live response.
const LIVE = [
  {
    code: "sat",
    name: "Santali",
    translation: "full",
    tts: "none",
    note: "No TTS checkpoint exists anywhere for Santali.",
    phrases_verified: false,
  },
  { code: "hoc", name: "Ho", translation: "phrase_bank", tts: "full", note: null, phrases_verified: true },
  { code: "unr", name: "Mundari", translation: "phrase_bank", tts: "full", note: null, phrases_verified: true },
  { code: "kru", name: "Kurukh", translation: "phrase_bank", tts: "full", note: null, phrases_verified: true },
  { code: "sck", name: "Sadri", translation: "phrase_bank", tts: "full", note: null, phrases_verified: true },
];

// The same languages as an older backend (or a new, unchecked entry) would
// report them: no verification claim may appear for these.
const UNCHECKED = LIVE.map((l) => {
  const copy = { ...l };
  delete copy.phrases_verified;
  return copy;
});

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

function bankBlurb(list) {
  return groupLanguages(list).find((g) => g.key === "phrase_bank").blurb;
}

test("the phrase-bank group says 'checked' only when every language is", () => {
  assert.match(bankBlurb(LIVE), /checked by native speakers/i);
  assert.doesNotMatch(bankBlurb(LIVE), /pending validation/i);

  // One unchecked language is enough to withdraw the claim for the group.
  const oneUnchecked = LIVE.map((l) => (l.code === "kru" ? { ...l, phrases_verified: false } : l));
  assert.match(bankBlurb(oneUnchecked), /pending validation/i);
  assert.match(bankBlurb(UNCHECKED), /pending validation/i);

  // Checked or not, it is never described as translation.
  for (const list of [LIVE, UNCHECKED]) {
    assert.match(bankBlurb(list), /no translation model exists/i);
  }
});

test("the phrase-bank note never claims a check the API did not report", () => {
  const ho = LIVE.find((l) => l.code === "hoc");
  assert.match(phraseBankNote(ho), /checked by native speakers/i);
  assert.match(phraseBankNote({ ...ho, phrases_verified: false }), /no native speaker has checked/i);
  assert.match(phraseBankNote({ ...ho, phrases_verified: "yes" }), /no native speaker has checked/i);
  assert.match(phraseBankNote({ code: "hoc" }), /no native speaker has checked/i);
  for (const l of [ho, { code: "hoc" }]) {
    assert.match(phraseBankNote(l), /not translated from your sentence/i);
  }
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

// --- the /translate boundary ------------------------------------------
// PRD.md §4 and RULES.md §2: Ho, Mundari, Kurukh and Sadri have no
// translation model anywhere. The Result screen builds a /translate
// request only when translateTargetFor() returns a target, so these
// assertions are what stops the request being built at all.

test("no phrase-bank language yields a translate target", () => {
  for (const language of LIVE.filter((l) => l.translation === "phrase_bank")) {
    assert.equal(
      translateTargetFor(language),
      null,
      `${language.name} must never be sent to /translate — there is no model`,
    );
  }
});

test("Santali yields the script-qualified IndicTrans2 target", () => {
  const sat = LIVE.find((l) => l.code === "sat");
  assert.equal(translateTargetFor(sat), "sat_Olck");
});

test("capability wins over the code map, not the other way round", () => {
  // Even a language the map knows about is refused if the API says it is
  // phrase-bank only. The capability field is the authority.
  assert.equal(
    translateTargetFor({ code: "sat", translation: "phrase_bank", tts: "full" }),
    null,
  );
  // And a language with no mapping is refused rather than guessed at.
  assert.equal(
    translateTargetFor({ code: "brx", translation: "full", tts: "none" }),
    null,
  );
});

test("only one language in the live list is translatable at all", () => {
  const translatable = LIVE.filter((l) => translateTargetFor(l) !== null);
  assert.deepEqual(translatable.map((l) => l.code), ["sat"]);
});

// --- the demo control's fixed pair -------------------------------------
// PLAN.md Phase 8: these sentences are hardcoded on purpose. The pair
// must stay exactly what backend/test_contrast.py asserts on, and must
// never quietly become the short-but-still-contaminated sentence.

test("the verified pair is the pair the backend test pins", () => {
  const byKey = Object.fromEntries(VERIFIED_CONTRAST.map((e) => [e.key, e]));
  assert.equal(
    byKey.textbook.hindi,
    "किसान खेत में गेहूँ उगाता है और उसे बाज़ार में बेचता है।",
  );
  assert.equal(byKey.adapted.hindi, "धान हाट में बिकता है।");
});

test("the clean half is never the sentence that still contaminates", () => {
  // किसान खेत में धान उगाता है। is short and adapted and STILL leaks
  // Meetei Mayek (ꯆꯦꯡ). Measured 2026-09-05. It must not be used as the
  // clean example (PRD.md §5).
  const trap = "किसान खेत में धान उगाता है।";
  for (const example of VERIFIED_CONTRAST) {
    assert.notEqual(
      example.hindi,
      trap,
      "this sentence contaminates despite being short — it cannot be either " +
        "half of the demo pair without re-checking against the live API",
    );
  }
});

test("the demo targets Santali through the same constant as everything else", () => {
  assert.equal(SANTALI_TARGET, "sat_Olck");
  assert.equal(
    translateTargetFor({ code: "sat", translation: "full", tts: "none" }),
    SANTALI_TARGET,
  );
});

// --- Phase 8.5: independence from the pedagogy step --------------------
// A slow or failing third-party LLM must not delay or cancel results
// that never needed it. These languages are spoken before /simplify.

test("phrase-bank languages with a voice do not wait on pedagogy", () => {
  for (const code of ["hoc", "unr", "kru", "sck"]) {
    const language = LIVE.find((l) => l.code === code);
    assert.equal(
      speaksWithoutPedagogy(language),
      true,
      `${code} uses the phrase bank and TTS, neither of which touches the LLM`,
    );
  }
});

test("Santali is not spoken early — it has no voice at all", () => {
  const sat = LIVE.find((l) => l.code === "sat");
  assert.equal(speaksWithoutPedagogy(sat), false);
});

test("a translatable language is never treated as pedagogy-independent", () => {
  // Hypothetical future language with both a model and a voice: its audio
  // comes from the translation, so it genuinely does depend on pedagogy.
  assert.equal(
    speaksWithoutPedagogy({ code: "sat", translation: "full", tts: "full" }),
    false,
  );
});

test("a language with no voice is never spoken, pedagogy or not", () => {
  assert.equal(
    speaksWithoutPedagogy({ code: "xxx", translation: "phrase_bank", tts: "none" }),
    false,
  );
});

// --- native names are decoration, never a claim ------------------------

test("a language with no native name still renders", () => {
  assert.equal(nativeName({ code: "zzz", translation: "full", tts: "none" }), null);
});

test("every live language has a native name, and none is a capability", () => {
  for (const language of LIVE) {
    assert.ok(nativeName(language), `${language.code} has no native name`);
  }
  // Changing the native name must not change what the UI claims.
  const sat = LIVE.find((l) => l.code === "sat");
  assert.equal(describeCapability({ ...sat, code: "zzz" }), describeCapability(sat));
});
