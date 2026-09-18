// Run: npm test
//
// Phase 12: /speak names the phrase it spoke in response headers. The UI
// shows that string as the spoken language, so a wrong decode would put
// mojibake — or someone else's text — where the Ho or Kurukh should be.

import assert from "node:assert/strict";
import { test } from "node:test";
import { spokenPhrase } from "../src/api.js";

function headers(fields) {
  return new Headers(fields);
}

// What the backend sends: base64 of the UTF-8 bytes.
function encode(text) {
  return Buffer.from(text, "utf-8").toString("base64");
}

test("a bank hit decodes to the exact Odia and Devanagari that was spoken", () => {
  for (const text of ["ଦା ଆଲେ ଜୀଉ ତାନା", "ଇସ୍କୁଲ ସେନୋଃ ମେ", "इस्सने उक्का"]) {
    const h = headers({ "X-Phrase-Bank-Match": "true", "X-Target-Text": encode(text) });
    assert.equal(spokenPhrase(h), text);
  }
});

test("without an explicit match, nothing is claimed as spoken", () => {
  const text = encode("ଦା ଆଲେ ଜୀଉ ତାନା");
  assert.equal(spokenPhrase(headers({})), null);
  assert.equal(spokenPhrase(headers({ "X-Target-Text": text })), null);
  assert.equal(spokenPhrase(headers({ "X-Phrase-Bank-Match": "false", "X-Target-Text": text })), null);
  assert.equal(spokenPhrase(headers({ "X-Phrase-Bank-Match": "true" })), null);
});

test("a malformed header falls back rather than showing garbage", () => {
  const bad = Buffer.from([0xff, 0xfe, 0xfd]).toString("base64"); // not UTF-8
  assert.equal(spokenPhrase(headers({ "X-Phrase-Bank-Match": "true", "X-Target-Text": bad })), null);
  assert.equal(spokenPhrase(headers({ "X-Phrase-Bank-Match": "true", "X-Target-Text": "%%%" })), null);
});

test("every backend call reports an unreachable server the same way", async () => {
  const api = await import("../src/api.js");
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
  try {
    const calls = [
      () => api.languages(),
      () => api.extractChapter(new Blob(["x"])),
      () => api.transcribeAudio(new Blob(["x"])),
      () => api.speak("पानी हमारा जीवन है", "hoc"),
      () => api.translate("पानी", "sat_Olck"),
    ];
    for (const call of calls) {
      await assert.rejects(call, /Couldn't reach the server/);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});
