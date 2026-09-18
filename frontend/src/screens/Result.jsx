import { useEffect, useState } from "react";
import JSZip from "jszip";
import {
  createLesson,
  languages as fetchLanguages,
  simplify,
  speak,
  translate,
} from "../api";
import { speaksWithoutPedagogy, translateTargetFor } from "../capability";
import LanguageResult from "../components/LanguageResult";
import PrintWorksheet from "../components/PrintWorksheet";
import { buildPackHtml, buildPackSummary } from "../offlinePack";

// Screen 3 — the lesson, adapted, translated where that is real, and
// spoken where a voice exists.
// Supports single sentences or whole chapter multi-sentence extraction.
//
// The calls run in sequence, not in parallel (ARCHITECTURE.md §5), and
// the order matters: the phrase-bank languages are spoken BEFORE
// /simplify is called, because they do not use the LLM at all. A slow or
// failing Gemini must not delay or cancel results that never needed it
// (PLAN.md Phase 8.5, added after a live 503 took the whole screen with
// it). A /simplify failure is caught and scoped to the languages that
// actually depended on it. In chapter mode this ordering holds per
// sentence.
//
// PRD.md §4's boundary is enforced here by construction, not by a check
// that could be forgotten: translateTargetFor() returns null for every
// phrase-bank language, so the /translate request is never built for Ho,
// Mundari, Kurukh or Sadri. They reach /speak only, which matches the
// text against the curated bank and refuses anything else. The backend
// 501s them too; this is the belt to those braces.
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
  const [isPrintOpen, setIsPrintOpen] = useState(false);

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

          // Helper to speak one language.
          //
          // On a phrase-bank hit /speak names the phrase it spoke, and that
          // is what gets shown (textIsTarget: true). Without that header the
          // text held is the Hindi that was sent, and textIsTarget stays
          // false so the render never presents that Hindi as spoken output.
          async function speakInto(language, text) {
            setStage(`Generating ${language.name} audio…`);
            try {
              const result = await speak(text, language.code);
              if (cancelled) return;
              const spoken = result.targetText
                ? { ...result, text: result.targetText, textIsTarget: true }
                : { ...result, text, textIsTarget: false };
              currentAudio[language.code] = spoken;
              if (idx === 0) {
                setAudio((prev) => ({ ...prev, [language.code]: spoken }));
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
                // One sentence the model can't handle is that sentence's
                // problem, shown on its card — not a reason to stop the
                // whole lesson or every later chapter sentence.
                let transObj;
                try {
                  const result = await translate(sentence, target);
                  if (cancelled) return;
                  transObj = {
                    code: language.code,
                    name: language.name,
                    sentence,
                    translated: result.translated,
                    contaminated: result.script_contamination,
                  };
                } catch (e) {
                  if (cancelled) return;
                  transObj = {
                    code: language.code,
                    name: language.name,
                    sentence,
                    translated: null,
                    error: e.message,
                  };
                }
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
              (t) => t.code === language.code && t.translated
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

  // Play one phrase from the bank, when the teacher's own sentence was not
  // in it. Same /speak route, same rules — just a phrase that will match.
  async function playPhrase(lang, phrase) {
    try {
      const result = await speak(phrase.hindi_source, lang);
      setAudio((prev) => ({
        ...prev,
        [lang]: { ...result, text: phrase.target_text, textIsTarget: true },
      }));
    } catch (e) {
      setAudio((prev) => ({
        ...prev,
        [lang]: { kind: "error", error: e.message },
      }));
    }
  }

  // Languages that can produce audio come first: that is what the teacher
  // is waiting for, and it is also the order the requests complete in.
  const ordered = [...chosen].sort(
    (a, b) => Number(b.tts === "full") - Number(a.tts === "full"),
  );

  // The pack carries the same honesty rules as the screen. Its HTML and
  // summary are built in src/offlinePack.js so those rules are tested
  // rather than trusted.
  async function handleDownloadOfflinePack() {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const pack = { results: chapterResults, languages: ordered, grade };

      const audioFolder = zip.folder("audio");
      chapterResults.forEach((item, idx) => {
        Object.entries(item.audio || {}).forEach(([langCode, data]) => {
          if (data.kind === "audio" && data.blob) {
            audioFolder.file(`sentence_${idx + 1}_${langCode}.wav`, data.blob);
          }
        });
      });

      zip.file("summary.txt", buildPackSummary(pack));
      zip.file("data.json", JSON.stringify(chapterResults, null, 2));
      zip.file("index.html", buildPackHtml(pack));

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

  return (
    <section aria-labelledby="result-heading">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">STEP 03</span>
        <span>LESSON AUDIO</span>
      </div>
      <h1 id="result-heading" className="screen-title">Ready to play</h1>
      <p className="screen-subtitle">
        Check the wording and listen to the audio before presenting it to your class.
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

      <div className="result-toolbar">
        <div className="result-toolbar-meta">
          <strong>Class {grade} lesson</strong>
          {chapterResults.length > 1 && (
            <span className="result-meta">
              {" "}· {chapterResults.length} chapter sentences
            </span>
          )}
        </div>
        <div className="result-toolbar-actions">
          {/* The worksheet holds one lesson line, so it is offered for a
              single sentence only; a chapter would print sentence 1 under
              the whole chapter's text. */}
          {chapterResults.length <= 1 && (
            <button
              type="button"
              className="button button--secondary tactile-btn-secondary"
              onClick={() => setIsPrintOpen(true)}
              disabled={stage !== ""}
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>Print worksheet</span>
            </button>
          )}
          <button
            type="button"
            className="button button--primary tactile-btn-primary"
            onClick={handleDownloadOfflinePack}
            disabled={isZipping || chapterResults.length === 0}
          >
            <span className="material-symbols-outlined text-base">folder_zip</span>
            <span>{isZipping ? "Packaging ZIP…" : "Download offline pack (.zip)"}</span>
          </button>
        </div>
      </div>

      {chapterResults.length > 1 ? (
        <div className="chapter-results-list">
          {chapterResults.map((item, idx) => (
            // Neutral surface: one sentence holds several languages with
            // different capabilities, so the capability edge belongs on each
            // language block inside it, never on the sentence as a whole.
            <div key={idx} className="work sentence-card">
              <div className="sentence-head">
                <h2>
                  Sentence {idx + 1} of {chapterResults.length}
                </h2>
                <span className="badge">Class {grade}</span>
              </div>
              <p className="sentence-source" lang="hi">
                {item.sourceText}
              </p>

              {!item.adapted && (
                <p className="error">
                  Couldn't simplify this sentence, so it has no rewrite and
                  no translation. Phrase-bank languages were not affected.
                </p>
              )}

              {item.adapted && (
                <div className="rewrite">
                  <span className="concept">Concept: {item.adapted.concept}</span>
                  <p className="rewrite-text" lang="hi">
                    {item.adapted.adapted_hindi.join(" ")}
                  </p>
                </div>
              )}

              {ordered.map((language) => (
                <LanguageResult
                  key={language.code}
                  language={language}
                  spoken={item.audio?.[language.code]}
                  translations={(item.translations || []).filter(
                    (t) => t.code === language.code
                  )}
                  simplifyFailed={!item.adapted}
                  lessonId={item.lessonId}
                  headingLevel={3}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          {ordered.map((language) => (
            <LanguageResult
              key={language.code}
              language={language}
              spoken={audio[language.code]}
              translations={translations.filter(
                (t) => t.code === language.code
              )}
              simplifyFailed={Boolean(simplifyError)}
              lessonId={lessonId}
              onPlayPhrase={playPhrase}
            />
          ))}

          {/* The pedagogy step's evidence. The headline swap stays open,
              because it is the argument the whole approach rests on; the
              full working is one click away. Single-sentence mode only: in
              chapter mode each sentence card shows its own rewrite, and this
              panel only ever holds sentence 1. */}
          {(adapted || simplifyError) && (
            <div className="work">
              <h2>What we changed in the Hindi</h2>
              {simplifyError ? (
                <p className="error">
                  Couldn't simplify the lesson this time. {simplifyError}
                </p>
              ) : (
                <>
                  <p className="summary-line">
                    {adapted.substitutions.length > 0 && (
                      <>
                        <span className="swap" lang="hi">
                          {adapted.substitutions[0].from} →{" "}
                          {adapted.substitutions[0].to}
                        </span>
                        {", and "}
                      </>
                    )}
                    {adapted.adapted_hindi.length} shorter sentence
                    {adapted.adapted_hindi.length === 1 ? "" : "s"}
                    {adapted.readability &&
                      ` (${adapted.readability.before_wps} words per sentence down to ${adapted.readability.after_wps})`}
                    .
                  </p>
                  <details className="detail">
                    <summary>See the full rewrite</summary>
                    <ol className="sentences" lang="hi">
                      {adapted.adapted_hindi.map((sentence, i) => (
                        <li key={i}>{sentence}</li>
                      ))}
                    </ol>
                    {adapted.substitutions.length > 0 && (
                      <ul className="subs">
                        {adapted.substitutions.map((s, i) => (
                          <li key={i}>
                            <span lang="hi">
                              {s.from} → {s.to}
                            </span>{" "}
                            — {s.why}
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="actions">
        <button className="button button--secondary tactile-btn-secondary" onClick={onBack}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Change languages</span>
        </button>
      </div>

      <PrintWorksheet
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        hindiText={hindiText}
        adapted={adapted}
        languages={ordered}
        translations={translations}
        audio={audio}
        grade={grade}
      />
    </section>
  );
}
