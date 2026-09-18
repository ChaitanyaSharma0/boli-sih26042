// The downloadable offline lesson pack: index.html and summary.txt.
//
// A pack leaves the app and gets shared between classrooms, so it has to
// carry the same honesty rules as the screen, on its own, with no app
// around it (PRD.md §4, RULES.md §2): every language shows whether it is
// real AI translation or phrase bank only, phrase-bank audio says it is
// from the curated bank (and whether a native speaker has checked it), and
// the Hindi that was sent is never presented as the phrase that was spoken.
//
// Pure functions, no DOM and no JSZip, so the rules are testable in Node.
//
// Every value that reaches the HTML goes through esc(): lesson text comes
// from typing, OCR or a PDF, and a pack is opened on other machines, so a
// "<script>" in a chapter must stay text.

import {
  capabilityBadge,
  phraseBankNote,
  phraseForLabel,
  phrasesVerified,
} from "./capability.js";

const CONTAMINATION_NOTE =
  "The model doesn't know a word in this sentence, so part of this line " +
  "is in the wrong script.";

// The same scope statement the app shows in its footer, because a pack has
// no app around it to say it. The verification claim is made only if every
// phrase-bank language in this pack has been checked by a native speaker.
export function packScopeNote(languages = []) {
  const bank = languages.filter((l) => l.translation === "phrase_bank");
  const checked = bank.length > 0 && bank.every(phrasesVerified);
  return (
    "Santali is really translated by an AI model and has no voice. Ho, " +
    "Mundari, Kurukh and Sadri have no translation model anywhere: they are " +
    "spoken from a small curated phrase bank, " +
    (checked ? "checked by native speakers." : "pending validation by a native speaker.")
  );
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

function audioPath(sentenceNumber, code) {
  return `audio/sentence_${sentenceNumber}_${code}.wav`;
}

function spokenText(language, spoken) {
  return spoken.textIsTarget
    ? spoken.text
    : `${phraseForLabel(language.name)} ${spoken.text}`;
}

function languageBlock(language, item, sentenceNumber) {
  const isBank = language.translation === "phrase_bank";
  const spoken = item.audio?.[language.code];
  const translations = (item.translations || []).filter(
    (t) => t.code === language.code,
  );
  const parts = [];

  const code = esc(language.code);

  if (spoken?.kind === "audio") {
    parts.push(
      `<audio controls src="${esc(audioPath(sentenceNumber, language.code))}"></audio>`,
      spoken.textIsTarget
        ? `<p lang="${code}" class="target">${esc(spokenText(language, spoken))}</p>`
        : `<p>${esc(spokenText(language, spoken))}</p>`,
    );
    if (isBank) parts.push(`<p class="note">${esc(phraseBankNote(language))}</p>`);
  }
  if (spoken?.kind === "phrase_bank_only") {
    parts.push(`<p class="note">${esc(spoken.reason)}</p>`);
  }
  if (spoken?.kind === "error") {
    parts.push(`<p class="error">Couldn't make the audio.</p>`);
  }
  translations.forEach((t) => {
    if (!t.translated) {
      parts.push(`<p class="error">No translation for this sentence: ${esc(t.error ?? "it failed")}</p>`);
      return;
    }
    parts.push(`<p lang="${code}" class="target">${esc(t.translated)}</p>`);
    if (t.contaminated) parts.push(`<p class="warn">${CONTAMINATION_NOTE}</p>`);
  });
  if (language.tts === "none") {
    parts.push(
      `<p class="note">${esc(
        language.note ?? "There is no voice for this language.",
      )} This is text only.</p>`,
    );
  }

  return `
      <div class="lang cap-${esc(language.translation)}">
        <h3>${esc(language.name)} <span class="badge">${esc(capabilityBadge(language))}</span></h3>
        ${parts.join("\n        ")}
      </div>`;
}

export function buildPackHtml({ results, languages, grade }) {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>BOLI — Offline Classroom Pack</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #16202b; line-height: 1.55; }
    h1 { color: #1E3A5F; }
    .card { background: #F1F4F8; padding: 1.2rem; margin-bottom: 1.2rem; border-radius: 8px; border: 1px solid #DCE3EC; }
    .meta, .scope { color: #55606E; font-size: 0.9rem; }
    .lang { margin-top: 0.75rem; padding: 0.6rem 0.8rem; background: #fff; border-radius: 6px; border: 1px solid #DCE3EC; border-left-width: 4px; }
    .cap-full { border-left: 4px solid #1B6B45; }
    .cap-phrase_bank { border-left: 4px dashed #B06A00; }
    .lang h3 { margin: 0 0 0.4rem; font-size: 1rem; color: #1E3A5F; }
    .badge { display: inline-block; margin-left: 0.4rem; padding: 0.1rem 0.4rem; border: 1px solid #55606E; border-radius: 6px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; color: #16202b; }
    .cap-full .badge { border-color: #1B6B45; background: #E8F3ED; }
    .cap-phrase_bank .badge { border-color: #B06A00; background: #FDF6EA; }
    .note { color: #55606E; font-size: 0.9rem; }
    .warn { border-left: 3px solid #B06A00; background: #FDF6EA; padding: 0.3rem 0.5rem; font-size: 0.9rem; }
    .error { color: #B02A20; }
    /* No web fonts: a pack must work offline. These are the system fonts
       that commonly cover Ol Chiki (Nirmala UI ships with Windows). */
    .target { font-size: 1.15rem; font-family: "Nirmala UI", "Noto Sans Ol Chiki", "Noto Sans Oriya", system-ui, sans-serif; }
    audio { display: block; margin: 0.4rem 0; width: 100%; }
  </style>
</head>
<body>
  <h1>BOLI — Offline Classroom Lesson</h1>
  <p class="meta">Class ${esc(grade)} · Zero-Connectivity Offline Classroom Pack</p>
  <p class="scope">${esc(packScopeNote(languages))}</p>
  ${results
    .map((item, idx) => {
      const n = idx + 1;
      return `
    <div class="card">
      <h2>Sentence ${n}</h2>
      <p><strong>Original Hindi:</strong> <span lang="hi">${esc(item.sourceText)}</span></p>
      ${
        item.adapted
          ? `<p><strong>Simplified Hindi:</strong> <span lang="hi">${esc(item.adapted.adapted_hindi.join(" "))}</span></p>`
          : ""
      }
      ${languages.map((language) => languageBlock(language, item, n)).join("")}
    </div>`;
    })
    .join("")}
</body>
</html>`;
}

export function buildPackSummary({ results, languages, grade }) {
  let text = "BOLI — Mother-Tongue Lesson Pack\n";
  text += `Grade / Class Level: Class ${grade}\n`;
  text += `Total Sentences: ${results.length}\n\n`;
  text += `${packScopeNote(languages)}\n\n`;

  results.forEach((item, idx) => {
    text += "===============================\n";
    text += `Sentence ${idx + 1}: ${item.sourceText}\n`;
    if (item.adapted) {
      text += `Concept: ${item.adapted.concept}\n`;
      text += `Simplified Hindi: ${item.adapted.adapted_hindi.join(" ")}\n`;
      if (item.adapted.substitutions?.length > 0) {
        text += "Substitutions:\n";
        item.adapted.substitutions.forEach((sub) => {
          text += `  - ${sub.from} -> ${sub.to} (${sub.why})\n`;
        });
      }
    }

    languages.forEach((language) => {
      const label = `${language.name}, ${capabilityBadge(language)}`;
      const spoken = item.audio?.[language.code];
      (item.translations || [])
        .filter((t) => t.code === language.code)
        .forEach((t) => {
          if (!t.translated) {
            text += `  [${label}]: no translation (${t.error ?? "it failed"})\n`;
            return;
          }
          text += `  [${label}]: ${t.translated}\n`;
          if (t.contaminated) text += `    ${CONTAMINATION_NOTE}\n`;
        });
      if (spoken?.kind === "audio") {
        text += `  [${label}] audio: ${spokenText(language, spoken)}\n`;
        if (language.translation === "phrase_bank") {
          text += `    ${phraseBankNote(language)}\n`;
        }
      }
    });
    text += "\n";
  });

  return text;
}
