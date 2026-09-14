import { useEffect, useState } from "react";
import JSZip from "jszip";
import {
  createLesson,
  languages as fetchLanguages,
  simplify,
  speak,
  translate,
} from "../api";
import {
  nativeName,
  speaksWithoutPedagogy,
  translateTargetFor,
} from "../capability";
import AudioPlayer from "../components/AudioPlayer";
import CorrectionForm from "../components/CorrectionForm";

// Screen 3 — the lesson, adapted, translated where that is real, and
// spoken where a voice exists.
// Supports single sentences or whole chapter multi-sentence extraction.
export default function Result({
  hindiText,
  grade = 2,
  chapterSentences = [],
  sourceType,
  selectedLangs,
  onBack,
}) {
  const [stage, setStage] = useState("Loading languages…");
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState([]);
  const [adapted, setAdapted] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [audio, setAudio] = useState({});
  const [lessonId, setLessonId] = useState(null);
  // Scoped to the languages that needed pedagogy — never fatal.
  const [simplifyError, setSimplifyError] = useState("");
  // Multi-sentence chapter processing results
  const [chapterResults, setChapterResults] = useState([]);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const sentenceList =
        chapterSentences && chapterSentences.length > 0
          ? chapterSentences
          : [hindiText].filter(Boolean);

      if (sentenceList.length === 0) return;

      try {
        const all = await fetchLanguages();
        if (cancelled) return;
        const picked = all.filter((l) => selectedLangs.includes(l.code));
        setChosen(picked);

        const accumulatedChapterResults = [];

        for (let idx = 0; idx < sentenceList.length; idx++) {
          const currentText = sentenceList[idx];
          setStage(
            sentenceList.length > 1
              ? `Processing sentence ${idx + 1} of ${sentenceList.length}…`
              : "Processing lesson…"
          );

          // 0. Record lesson submission
          let currentLessonId = null;
          try {
            const lesson = await createLesson({
              sourceText: currentText,
              sourceType,
              languages: selectedLangs,
            });
            if (cancelled) return;
            currentLessonId = lesson.id;
            if (idx === 0) setLessonId(lesson.id);
          } catch {
            // Non-fatal if lesson logging fails
          }

          const currentAudio = {};
          const currentTranslations = [];

          // Helper to speak one language
          async function speakInto(language, text) {
            setStage(`Generating ${language.name} audio…`);
            try {
              const result = await speak(text, language.code);
              if (cancelled) return;
              currentAudio[language.code] = { ...result, text };
              if (idx === 0) {
                setAudio((prev) => ({
                  ...prev,
                  [language.code]: { ...result, text },
                }));
              }
            } catch (e) {
              if (cancelled) return;
              currentAudio[language.code] = { kind: "error", error: e.message };
              if (idx === 0) {
                setAudio((prev) => ({
                  ...prev,
                  [language.code]: { kind: "error", error: e.message },
                }));
              }
            }
          }

          // 1. Speak phrase bank languages that do not depend on LLM
          for (const language of picked.filter(speaksWithoutPedagogy)) {
            await speakInto(language, currentText);
            if (cancelled) return;
          }

          // 2. Simplify with grade level
          setStage(
            sentenceList.length > 1
              ? `Simplifying sentence ${idx + 1} of ${sentenceList.length} (Class ${grade})…`
              : `Simplifying lesson (Class ${grade})…`
          );
          let simplified = null;
          try {
            simplified = await simplify(currentText, grade);
            if (cancelled) return;
            if (idx === 0) setAdapted(simplified);
          } catch (e) {
            if (cancelled) return;
            if (idx === 0) setSimplifyError(e.message);
          }

          // 3. Translate where real model exists
          if (simplified) {
            for (const language of picked) {
              const target = translateTargetFor(language);
              if (!target) continue;
              setStage(`Translating into ${language.name}…`);
              for (const sentence of simplified.adapted_hindi) {
                const result = await translate(sentence, target);
                if (cancelled) return;
                const transObj = {
                  code: language.code,
                  name: language.name,
                  sentence,
                  translated: result.translated,
                  contaminated: result.script_contamination,
                };
                currentTranslations.push(transObj);
                if (idx === 0) {
                  setTranslations((prev) => [...prev, transObj]);
                }
              }
            }
          }

          // 4. Speak anything with translation + voice
          for (const language of picked) {
            if (language.tts !== "full" || speaksWithoutPedagogy(language))
              continue;
            const mine = currentTranslations.filter(
              (t) => t.code === language.code
            );
            if (!mine.length) continue;
            await speakInto(
              language,
              mine.map((t) => t.translated).join(" ")
            );
            if (cancelled) return;
          }

          accumulatedChapterResults.push({
            sentenceIndex: idx,
            sourceText: currentText,
            lessonId: currentLessonId,
            adapted: simplified,
            translations: currentTranslations,
            audio: currentAudio,
          });
          setChapterResults([...accumulatedChapterResults]);
        }

        setStage("");
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
        setStage("");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [hindiText, grade, chapterSentences, sourceType, selectedLangs]);

  async function handleDownloadOfflinePack() {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      let summaryText = "BOLI — Mother-Tongue Lesson Pack\n";
      summaryText += `Grade / Class Level: Class ${grade}\n`;
      summaryText += `Total Sentences: ${chapterResults.length}\n\n`;

      const audioFolder = zip.folder("audio");

      chapterResults.forEach((item, idx) => {
        summaryText += "===============================\n";
        summaryText += `Sentence ${idx + 1}: ${item.sourceText}\n`;
        if (item.adapted) {
          summaryText += `Concept: ${item.adapted.concept}\n`;
          summaryText += `Simplified Hindi: ${item.adapted.adapted_hindi.join(" ")}\n`;
          if (item.adapted.substitutions?.length > 0) {
            summaryText += "Substitutions:\n";
            item.adapted.substitutions.forEach((sub) => {
              summaryText += `  - ${sub.from} -> ${sub.to} (${sub.why})\n`;
            });
          }
        }
        if (item.translations?.length > 0) {
          summaryText += "Translations:\n";
          item.translations.forEach((t) => {
            summaryText += `  [${t.name}]: ${t.translated}\n`;
          });
        }
        summaryText += "\n";

        if (item.audio) {
          Object.entries(item.audio).forEach(([langCode, data]) => {
            if (data.kind === "audio" && data.blob) {
              audioFolder.file(`sentence_${idx + 1}_${langCode}.wav`, data.blob);
            }
          });
        }
      });

      zip.file("summary.txt", summaryText);
      zip.file("data.json", JSON.stringify(chapterResults, null, 2));

      const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>BOLI — Offline Classroom Pack</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { color: #1E3A5F; }
    .card { background: #F1F4F8; padding: 1.2rem; margin-bottom: 1.2rem; border-radius: 8px; border-left: 5px solid #1B6B45; }
    .meta { color: #666; font-size: 0.9rem; }
    .trans-box { margin-top: 0.5rem; padding: 0.5rem; background: #fff; border-radius: 4px; }
    audio { display: block; margin-top: 0.5rem; width: 100%; }
  </style>
</head>
<body>
  <h1>BOLI — Offline Classroom Lesson</h1>
  <p class="meta">Class ${grade} · Zero-Connectivity Offline Classroom Pack</p>
  ${chapterResults
    .map(
      (item, idx) => `
    <div class="card">
      <h3>Sentence ${idx + 1}</h3>
      <p><strong>Original Hindi:</strong> ${item.sourceText}</p>
      ${
        item.adapted
          ? `<p><strong>Simplified Hindi:</strong> ${item.adapted.adapted_hindi.join(" ")}</p>`
          : ""
      }
      ${(item.translations || [])
        .map(
          (t) => `
        <div class="trans-box">
          <strong>${t.name}:</strong> ${t.translated}
        </div>`
        )
        .join("")}
      ${Object.entries(item.audio || {})
        .filter(([, a]) => a.kind === "audio")
        .map(
          ([langCode, a]) => `
        <div class="trans-box">
          <strong>Audio (${langCode}):</strong> <em>${a.text || ""}</em>
          <audio controls src="audio/sentence_${idx + 1}_${langCode}.wav"></audio>
        </div>`
        )
        .join("")}
    </div>`
    )
    .join("")}
</body>
</html>`;
      zip.file("index.html", htmlContent);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `boli_class_${grade}_offline_pack.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to create offline pack: " + err.message);
    } finally {
      setIsZipping(false);
    }
  }

  // Play one phrase from the bank, when the teacher's own sentence was not
  // in it. Same /speak route, same rules — just a phrase that will match.
  async function playPhrase(lang, phrase) {
    try {
      const result = await speak(phrase.hindi_source, lang);
      setAudio((prev) => ({
        ...prev,
        [lang]: { ...result, text: phrase.target_text },
      }));
    } catch (e) {
      setAudio((prev) => ({
        ...prev,
        [lang]: { kind: "error", error: e.message },
      }));
    }
  }

  return (
    <section aria-labelledby="result-heading">
      <p className="eyebrow">Step 03 · Result</p>
      <h1 id="result-heading">A lesson, ready to be heard.</h1>
      <p className="intro">
        Check the wording and the audio before playing it to the class.
      </p>

      <div role="status" aria-live="polite">
        {stage && (
          <p className="stage">
            <span className="spinner" aria-hidden="true" />
            {stage}
          </p>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      <div style={{ margin: "1rem 0", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="button button--primary"
          onClick={handleDownloadOfflinePack}
          disabled={isZipping || chapterResults.length === 0}
        >
          {isZipping ? "Packaging ZIP…" : "📦 Download Offline Pack (.zip)"}
        </button>
        {chapterResults.length > 1 && (
          <span style={{ fontSize: "0.9rem", color: "#555" }}>
            Chapter mode: {chapterResults.length} sentences processed (Class {grade})
          </span>
        )}
      </div>

      {chapterResults.length > 1 ? (
        <div className="chapter-results-list" style={{ display: "grid", gap: "1.2rem" }}>
          {chapterResults.map((item, idx) => (
            <div
              key={idx}
              className="panel"
              style={{
                borderLeft: "4px solid var(--accent, #1B6B45)",
                padding: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span className="eyebrow" style={{ margin: 0 }}>
                  Sentence {idx + 1} of {chapterResults.length}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#666" }}>Class {grade}</span>
              </div>
              <p style={{ fontWeight: "bold", fontSize: "1.05rem", margin: "0.25rem 0" }} lang="hi">
                {item.sourceText}
              </p>

              {item.adapted && (
                <div style={{ margin: "0.75rem 0", padding: "0.5rem", background: "rgba(0,0,0,0.03)", borderRadius: "4px" }}>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", color: "#555" }}>
                    Concept: {item.adapted.concept}
                  </p>
                  <p style={{ margin: 0, fontWeight: 500 }} lang="hi">
                    {item.adapted.adapted_hindi.join(" ")}
                  </p>
                </div>
              )}

              {item.translations?.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  {item.translations.map((t, tIdx) => (
                    <div key={tIdx} style={{ fontSize: "0.95rem", margin: "0.25rem 0" }}>
                      <strong>{t.name}:</strong> <span lang={t.code}>{t.translated}</span>
                      {t.contaminated && (
                        <span className="warn" style={{ display: "block", fontSize: "0.8rem" }}>
                          (Script contamination detected)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {item.audio && Object.keys(item.audio).length > 0 && (
                <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>
                  {Object.entries(item.audio).map(([langCode, a]) => {
                    const langObj = chosen.find((c) => c.code === langCode);
                    const langName = langObj ? langObj.name : langCode;
                    return (
                      <div key={langCode}>
                        {a.kind === "audio" && (
                          <>
                            <AudioPlayer blob={a.blob} label={`${langName} audio`} />
                            {a.text && (
                              <p className="note" style={{ margin: "0.2rem 0" }} lang={langCode}>
                                Spoken ({langName}): {a.text}
                              </p>
                            )}
                          </>
                        )}
                        {a.kind === "phrase_bank_only" && (
                          <p className="note" style={{ margin: "0.2rem 0" }}>
                            {langName}: Not in phrase bank today.
                          </p>
                        )}
                        {a.kind === "error" && (
                          <p className="error" style={{ margin: "0.2rem 0" }}>
                            {langName}: {a.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          {simplifyError && (
            <div className="panel">
              <h2>Simplified Hindi</h2>
              <p className="error">
                The lesson could not be simplified this time. {simplifyError}
              </p>
              <p className="note">
                Anything below that does not need this step is unaffected.
              </p>
            </div>
          )}

      {adapted && (
        <div className="panel panel--simplified">
          <h2>Simplified Hindi</h2>
          <p className="group-blurb">
            {adapted.concept} — rewritten for a child who does not speak Hindi
            at home. Still Hindi; nothing is translated yet.
          </p>
          <ol className="sentence-list" lang="hi">
            {adapted.adapted_hindi.map((sentence, i) => (
              <li key={i}>{sentence}</li>
            ))}
          </ol>
          {adapted.substitutions.length > 0 && (
            <ul className="subs">
              {adapted.substitutions.map((s, i) => (
                <li key={i}>
                  <strong>{s.from}</strong> → <strong>{s.to}</strong> — {s.why}
                </li>
              ))}
            </ul>
          )}
          <p className="note">
            About {adapted.readability.before_wps} words per sentence before,{" "}
            {adapted.readability.after_wps} after.
          </p>
        </div>
      )}

      {chosen.map((language) => {
        const mine = translations.filter((t) => t.code === language.code);
        const spoken = audio[language.code];
        const isBank = language.translation === "phrase_bank";

        return (
          <article
            key={language.code}
            className={"panel result-card chip-" + language.translation}
            aria-labelledby={"result-" + language.code}
          >
            <div className="result-heading">
              <h2 id={"result-" + language.code}>
                {language.name}
                {nativeName(language) && (
                  <span className="chip-native" lang={language.code}>
                    {nativeName(language)}
                  </span>
                )}
              </h2>
              <span className="chip-badge">
                {isBank ? "Phrase bank only" : "AI translation"}
              </span>
            </div>

            {isBank && (
              <p className="group-blurb">
                No translation model exists for {language.name}. Anything below
                comes from the curated phrase bank, not from translating your
                sentence — and it is pending validation by a native speaker.
              </p>
            )}

            {simplifyError && !isBank && (
              <p className="error">
                No {language.name} translation this time: it depends on the
                simplification step, which failed. The other languages on this
                page were not affected.
              </p>
            )}

            {mine.length > 0 && (
              <>
                <ol className="sentence-list translated">
                  {mine.map((t, i) => (
                    <li key={i} lang={language.code}>
                      {t.translated}
                      {t.contaminated && (
                        <span className="warn">
                          The model does not recognise a word in this sentence,
                          so part of this line is in the wrong script. Try
                          simpler, more local wording.
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
                <CorrectionForm
                  lang={language.code}
                  original={mine.map((t) => t.translated).join(" ")}
                  lessonId={lessonId}
                />
              </>
            )}

            {language.tts === "none" && (
              <p className="note">
                {language.note ?? "There is no voice for this language."} This is
                text only.
              </p>
            )}

            {spoken?.kind === "audio" && (
              <>
                <AudioPlayer
                  blob={spoken.blob}
                  label={language.name + " audio"}
                />
                <p className="note" lang={language.code}>
                  Spoken: {spoken.text}
                </p>
                {isBank && (
                  <CorrectionForm
                    lang={language.code}
                    original={spoken.text}
                    lessonId={lessonId}
                  />
                )}
              </>
            )}

            {spoken?.kind === "phrase_bank_only" && (
              <>
                <p className="note">{spoken.reason}</p>
                <p className="field-label">
                  What BOLI can say in {language.name} today
                </p>
                <ul className="phrase-options">
                  {spoken.options.map((phrase) => (
                    <li key={phrase.id}>
                      {phrase.hindi_source} —{" "}
                      <span lang={language.code}>{phrase.target_text}</span>{" "}
                      <button
                        className="link"
                        onClick={() => playPhrase(language.code, phrase)}
                      >
                        Play
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {spoken?.kind === "error" && (
              <p className="error">Could not generate audio. {spoken.error}</p>
            )}
          </article>
        );
      })}
        </>
      )}

      <div className="actions">
        <button className="button button--secondary" onClick={onBack}>
          <span aria-hidden="true">←</span> Change languages
        </button>
      </div>
    </section>
  );
}
