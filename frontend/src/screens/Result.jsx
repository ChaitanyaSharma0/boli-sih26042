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
import PrintWorksheet from "../components/PrintWorksheet";

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
  const [simplifyError, setSimplifyError] = useState("");
  const [chapterResults, setChapterResults] = useState([]);
  const [isZipping, setIsZipping] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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
              // result may contain { kind: "audio", blob, targetText } via Phase 12 header
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
              : `Simplifying lesson for Class ${grade}…`
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

          // 3. Translate where real model exists (fallback to currentText if simplify failed or is empty)
          const sentencesToTranslate =
            simplified &&
            Array.isArray(simplified.adapted_hindi) &&
            simplified.adapted_hindi.length > 0
              ? simplified.adapted_hindi
              : [currentText];

          for (const language of picked) {
            const target = translateTargetFor(language);
            if (!target) continue;
            setStage(`Translating into ${language.name}…`);
            for (const sentence of sentencesToTranslate) {
              try {
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
              } catch (transErr) {
                console.warn(`Translation error for ${language.name}:`, transErr);
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
      let summaryText = "BOLI — Multilingual Classroom Lesson Pack\n";
      summaryText += `Grade Level: Class ${grade}\n`;
      summaryText += `Total Sentences: ${chapterResults.length || 1}\n\n`;

      const audioFolder = zip.folder("audio");
      const resultsToExport =
        chapterResults.length > 0
          ? chapterResults
          : [
              {
                sentenceIndex: 0,
                sourceText: hindiText,
                adapted,
                translations,
                audio,
              },
            ];

      resultsToExport.forEach((item, idx) => {
        summaryText += `==============================================\n`;
        summaryText += `Sentence ${idx + 1}: ${item.sourceText}\n`;
        if (item.adapted) {
          summaryText += `Concept: ${item.adapted.concept}\n`;
          summaryText += `Simplified Hindi: ${item.adapted.adapted_hindi.join(" ")}\n`;
          if (item.adapted.substitutions?.length > 0) {
            summaryText += `Cultural Substitutions:\n`;
            item.adapted.substitutions.forEach((sub) => {
              summaryText += `  - ${sub.from} -> ${sub.to} (${sub.why})\n`;
            });
          }
        }
        if (item.translations?.length > 0) {
          summaryText += `Translations:\n`;
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
      zip.file("data.json", JSON.stringify(resultsToExport, null, 2));

      const htmlContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>BOLI — Offline Classroom Pack</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.6; }
    h1 { color: #1E3A5F; }
    .card { background: #F1F4F8; padding: 1.25rem; margin-bottom: 1.25rem; border-radius: 10px; border-left: 5px solid #1B6B45; }
    .meta { color: #555; font-size: 0.9rem; }
    .trans-box { margin-top: 0.6rem; padding: 0.6rem; background: #fff; border-radius: 6px; }
    audio { display: block; margin-top: 0.5rem; width: 100%; }
  </style>
</head>
<body>
  <h1>BOLI — Offline Classroom Lesson</h1>
  <p class="meta">Class ${grade} · Zero-Connectivity Classroom Player</p>
  ${resultsToExport
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
          <strong>Audio (${langCode}):</strong> <em>${a.targetText || a.text || ""}</em>
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
      <div className="section-eyebrow">
        <span className="eyebrow-tag">STEP 03</span>
        <span>LESSON AUDIO & SYNTHESIS</span>
      </div>
      <h1 id="result-heading" className="screen-title">A lesson, ready to be heard.</h1>
      <p className="screen-subtitle">
        Check the wording and listen to the audio before presenting to your class.
      </p>

      {/* Top Action Toolbar */}
      <div className="result-toolbar">
        <div className="result-toolbar-meta">
          <strong>Class {grade} Lesson</strong>
          {chapterResults.length > 1 && (
            <span style={{ marginLeft: "0.5rem", color: "var(--text-light)" }}>
              ({chapterResults.length} chapter sentences)
            </span>
          )}
        </div>

        <div className="result-toolbar-actions">
          <button
            type="button"
            className="button button--secondary tactile-btn-secondary"
            onClick={() => setIsPrintModalOpen(true)}
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Print Worksheet (with QR)</span>
          </button>
          <button
            type="button"
            className="button button--primary tactile-btn-primary"
            onClick={handleDownloadOfflinePack}
            disabled={isZipping || stage !== ""}
          >
            <span className="material-symbols-outlined text-base">folder_zip</span>
            <span>{isZipping ? "Creating ZIP…" : "Download Offline Pack (.zip)"}</span>
          </button>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {stage && (
          <p className="stage">
            <span className="spinner" aria-hidden="true" />
            {stage}
          </p>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      {chapterResults.length > 1 ? (
        /* Multi-sentence Chapter Mode */
        <div className="chapter-results-list" style={{ display: "grid", gap: "1.5rem" }}>
          {chapterResults.map((item, idx) => (
            <article
              key={idx}
              className="panel"
              style={{ borderLeft: "5px solid var(--green)" }}
            >
              <div className="panel-header">
                <span className="eyebrow" style={{ margin: 0 }}>
                  Sentence {idx + 1} of {chapterResults.length}
                </span>
                <span className="group-tag group-tag--ai">Class {grade}</span>
              </div>

              <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0.25rem 0 0.75rem 0" }} lang="hi">
                {item.sourceText}
              </p>

              {item.adapted && (
                <div style={{ margin: "0.75rem 0", padding: "0.75rem", background: "var(--card-subtle)", borderRadius: "var(--radius-md)" }}>
                  <span className="concept-badge">Concept: {item.adapted.concept}</span>
                  <p style={{ margin: "0.35rem 0 0 0", fontWeight: 600 }} lang="hi">
                    {item.adapted.adapted_hindi.join(" ")}
                  </p>
                </div>
              )}

              {item.translations?.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  {item.translations.map((t, tIdx) => (
                    <div key={tIdx} className="hero-script-display">
                      <div className="lang-card-header">
                        <span className="lang-name">{t.name}</span>
                        <span className="chip-badge chip-badge--full">AI translation</span>
                      </div>
                      <div className="target-script-large" lang={t.code}>
                        {t.translated}
                      </div>
                      {t.contaminated && (
                        <span className="warn">
                          The model does not recognise a word in this sentence, so part of this line is in the wrong script.
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {item.audio && Object.keys(item.audio).length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  {Object.entries(item.audio).map(([langCode, a]) => {
                    const langObj = chosen.find((c) => c.code === langCode);
                    const langName = langObj ? langObj.name : langCode;
                    return (
                      <div key={langCode} style={{ marginBottom: "0.75rem" }}>
                        {a.kind === "audio" && (
                          <div className="hero-script-display" style={{ borderLeft: "4px solid var(--amber)" }}>
                            <div className="lang-card-header">
                              <span className="lang-name">{langName}</span>
                              <span className="chip-badge chip-badge--phrase_bank">Phrase bank voice</span>
                            </div>
                            {/* Phase 12: Prominent native script display */}
                            {a.targetText ? (
                              <div className="target-script-large" lang={langCode}>
                                {a.targetText}
                              </div>
                            ) : (
                              <div className="target-script-large" lang="hi">
                                {a.text}
                              </div>
                            )}
                            <AudioPlayer blob={a.blob} label={`${langName} spoken audio`} />
                          </div>
                        )}
                        {a.kind === "phrase_bank_only" && (
                          <p className="note" style={{ margin: "0.25rem 0" }}>
                            {langName}: Phrase bank only.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        /* Single Sentence Mode */
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
              <div className="panel-header">
                <h2>Simplified Hindi <span lang="hi">(आसान हिंदी)</span></h2>
                <span className="concept-badge">Class {grade}</span>
              </div>
              <p className="group-blurb">
                <strong>Concept:</strong> {adapted.concept} — rewritten for a child whose mother tongue is not Hindi.
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
                Readability: {adapted.readability.before_wps} words/sentence originally →{" "}
                <strong>{adapted.readability.after_wps} words/sentence</strong> adapted.
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
                <div className="result-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 id={"result-" + language.code} style={{ margin: 0 }}>
                    {language.name}{" "}
                    {nativeName(language) && (
                      <span className="lang-native" lang={language.code}>
                        ({nativeName(language)})
                      </span>
                    )}
                  </h2>
                  <span className={`chip-badge chip-badge--${language.translation}`}>
                    {isBank ? "Phrase bank only" : "AI translation"}
                  </span>
                </div>

                {isBank && (
                  <p className="group-desc" style={{ marginTop: "0.5rem" }}>
                    No translation model exists for {language.name}. Anything below comes from the curated phrase bank, not from translating your sentence — and it is pending validation by a native speaker.
                  </p>
                )}

                {simplifyError && !isBank && (
                  <p className="error">
                    No {language.name} translation this time: it depends on the simplification step, which failed. The other languages on this page were not affected.
                  </p>
                )}

                {mine.length > 0 && (
                  <>
                    <div className="hero-script-display">
                      {mine.map((t, i) => (
                        <div key={i}>
                          <div className="target-script-large" lang={language.code}>
                            {t.translated}
                          </div>
                          {t.contaminated && (
                            <span className="warn">
                              The model does not recognise a word in this sentence, so part of this line is in the wrong script. Try simpler, more local wording.
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <CorrectionForm
                      lang={language.code}
                      original={mine.map((t) => t.translated).join(" ")}
                      lessonId={lessonId}
                    />
                  </>
                )}

                {language.tts === "none" && (
                  <p className="note">
                    {language.note ?? "There is no voice for this language."} This is text only.
                  </p>
                )}

                {spoken?.kind === "audio" && (
                  <>
                    <div className="hero-script-display" style={{ borderLeft: "4px solid var(--amber)" }}>
                      <span className="field-label" style={{ fontSize: "0.8rem" }}>
                        Spoken Phrase (Real Target Script):
                      </span>
                      {/* Phase 12: Prominent target script */}
                      <div className="target-script-large" lang={language.code}>
                        {spoken.targetText || spoken.text}
                      </div>
                      <AudioPlayer
                        blob={spoken.blob}
                        label={language.name + " audio"}
                      />
                    </div>
                    {isBank && (
                      <CorrectionForm
                        lang={language.code}
                        original={spoken.targetText || spoken.text}
                        lessonId={lessonId}
                      />
                    )}
                  </>
                )}

                {spoken?.kind === "phrase_bank_only" && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p className="note">{spoken.reason}</p>
                    <p className="field-label" style={{ marginTop: "0.5rem" }}>
                      What BOLI can say in {language.name} today:
                    </p>
                    <ul className="phrase-options" style={{ paddingLeft: "1.2rem", margin: "0.25rem 0" }}>
                      {spoken.options.map((phrase) => (
                        <li key={phrase.id} style={{ marginBottom: "0.35rem" }}>
                          {phrase.hindi_source} —{" "}
                          <strong lang={language.code}>{phrase.target_text}</strong>{" "}
                          <button
                            type="button"
                            className="button button--secondary"
                            style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem", marginLeft: "0.5rem" }}
                            onClick={() => playPhrase(language.code, phrase)}
                          >
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                              play_arrow
                            </span>
                            <span>Play</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
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
        <button className="button button--secondary tactile-btn-secondary" onClick={onBack}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Change languages</span>
        </button>
      </div>

      {/* Printable Worksheet Modal with QR Code */}
      <PrintWorksheet
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        hindiText={hindiText}
        adapted={adapted}
        translations={translations}
        grade={grade}
        audio={audio}
      />
    </section>
  );
}
