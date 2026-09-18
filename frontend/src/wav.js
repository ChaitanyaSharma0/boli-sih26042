// Turn whatever the browser recorded into 16 kHz mono WAV for /asr.
//
// MediaRecorder never produces WAV: Chrome records WebM/Opus and Safari
// MP4/AAC, and the backend can only read WAV (libsndfile has no WebM, and
// there is no ffmpeg on the server). So the browser, which can decode its
// own recordings, does the conversion — and resamples to the 16 kHz mono
// the MMS model expects while it is at it.

export const ASR_SAMPLE_RATE = 16000;

// PCM samples in [-1, 1] -> a complete 16-bit mono WAV file.
export function encodeWav(samples, sampleRate = ASR_SAMPLE_RATE) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// Browser only: decode a recording and resample it to 16 kHz mono WAV.
export async function toAsrWav(blob) {
  const bytes = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  let decoded;
  try {
    decoded = await ctx.decodeAudioData(bytes);
  } catch {
    throw new Error("This recording could not be read. Try recording again.");
  } finally {
    ctx.close();
  }
  const frames = Math.max(1, Math.ceil(decoded.duration * ASR_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frames, ASR_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded; // a multi-channel buffer is mixed down to mono here
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return encodeWav(rendered.getChannelData(0), ASR_SAMPLE_RATE);
}
