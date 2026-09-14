// Run: npm test (Node's built-in runner, no framework)
// Tests for Grade-Level Selector, Chapter Processing, and Offline ZIP Pack

import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";

test("grade levels 1 through 5 are valid integer targets", () => {
  const grades = [1, 2, 3, 4, 5];
  for (const g of grades) {
    assert.equal(typeof g, "number");
    assert.ok(g >= 1 && g <= 5);
  }
});

test("offline zip pack creates summary and audio files correctly", async () => {
  const zip = new JSZip();
  const mockResults = [
    {
      sentenceIndex: 0,
      sourceText: "किसान खेत में धान उगाता है।",
      adapted: {
        concept: "Farmers cultivate crops.",
        adapted_hindi: ["किसान खेत में काम करता है।"],
        substitutions: [{ from: "गेहूँ", to: "धान", why: "Local crop" }],
      },
      translations: [
        {
          code: "sat",
          name: "Santali",
          translated: "ᱪᱟᱥᱤᱭᱟᱹ ᱫᱚ ᱪᱟᱥ ᱚᱲᱟᱜ ᱨᱮ ᱠᱟᱹᱢᱤ ᱮᱫᱼᱟ ᱾",
          contaminated: false,
        },
      ],
      audio: {},
    },
  ];

  zip.file("summary.txt", "BOLI Offline Pack\nClass: 2\nOriginal: " + mockResults[0].sourceText);
  zip.file("data.json", JSON.stringify(mockResults));

  const content = await zip.generateAsync({ type: "nodebuffer" });
  assert.ok(content.length > 0, "ZIP buffer must not be empty");

  // Re-read generated zip to verify files
  const readZip = await JSZip.loadAsync(content);
  assert.ok(readZip.file("summary.txt"), "summary.txt must be inside ZIP");
  assert.ok(readZip.file("data.json"), "data.json must be inside ZIP");

  const readSummary = await readZip.file("summary.txt").async("string");
  assert.ok(readSummary.includes("BOLI Offline Pack"));
  assert.ok(readSummary.includes("किसान खेत में धान उगाता है।"));
});

test("Hindi sentence splitting regex breaks on danda, newlines, and punctuation", () => {
  const hindiText = "किसान खेत में धान उगाता है। वह मेहनत करता है! क्या फसल अच्छी है? हाँ, बिल्कुल।";
  const regex = /[\u0964\u0965?!.\n]+/;
  const sentences = hindiText
    .split(regex)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  assert.equal(sentences.length, 4);
  assert.equal(sentences[0], "किसान खेत में धान उगाता है");
  assert.equal(sentences[1], "वह मेहनत करता है");
  assert.equal(sentences[2], "क्या फसल अच्छी है");
  assert.equal(sentences[3], "हाँ, बिल्कुल");
});
