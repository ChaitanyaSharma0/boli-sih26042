// Run: npm test
//
// /asr only reads WAV, and the browser records WebM/MP4, so every
// dictation goes through encodeWav. A wrong header here means the backend
// rejects every recording — which is exactly how dictation was broken.

import assert from "node:assert/strict";
import { test } from "node:test";

import { ASR_SAMPLE_RATE, encodeWav } from "../src/wav.js";

test("encodeWav writes a valid 16 kHz mono 16-bit PCM WAV", async () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]);
  const blob = encodeWav(samples, ASR_SAMPLE_RATE);
  assert.equal(blob.type, "audio/wav");
  const view = new DataView(await blob.arrayBuffer());
  const text = (o, n) => String.fromCharCode(...new Uint8Array(view.buffer, o, n));
  assert.equal(text(0, 4), "RIFF");
  assert.equal(text(8, 4), "WAVE");
  assert.equal(view.getUint16(20, true), 1, "PCM");
  assert.equal(view.getUint16(22, true), 1, "mono");
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(34, true), 16, "16-bit");
  assert.equal(view.getUint32(40, true), samples.length * 2);
  assert.equal(view.byteLength, 44 + samples.length * 2);
  // Values are scaled and clipped, never wrapped round.
  const pcm = [...Array(samples.length)].map((_, i) => view.getInt16(44 + i * 2, true));
  assert.deepEqual(pcm, [0, 16383, -16384, 32767, -32768, 32767, -32768]);
});
