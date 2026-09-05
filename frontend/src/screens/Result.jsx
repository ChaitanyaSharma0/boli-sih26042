import { useEffect, useState } from "react";
import {
  createLesson,
  languages as fetchLanguages,
  simplify,
  speak,
  translate,
} from "../api";
import { speaksWithoutPedagogy, translateTargetFor } from "../capability";
import AudioPlayer from "../components/AudioPlayer";
import CorrectionForm from "../components/CorrectionForm";

// Screen 3 — the lesson, adapted, translated where that is real, and
// spoken where a voice exists.
//
// The calls run in sequence, not in parallel (ARCHITECTURE.md §5), and
// the order matters: the phrase-bank languages are spoken BEFORE
// /simplify is called, because they do not use the LLM at all. A slow or
// failing Gemini must not delay or cancel results that never needed it
// (PLAN.md Phase 8.5, added after a live 503 took the whole screen with
// it). A /simplify failure is caught and scoped to the languages that
// actually depended on it.
//
// PRD.md §4's boundary is enforced here by construction, not by a check
// that could be forgotten: translateTargetFor() returns null for every
// phrase-bank language, so the /translate request is never built for Ho,
// Mundari, Kurukh or Sadri. They reach /speak only, which matches the
// text against the curated bank and refuses anything else. The backend
// 501s them too; this is the belt to those braces.

export default function Result({
  hindiText,
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // Accumulated locally as the sequence runs, then mirrored into
      // state. Reading React state mid-loop would read a stale snapshot.
      const translated = [];

      try {
        const all = await fetchLanguages();
        if (cancelled) return;
        const picked = all.filter((l) => selectedLangs.includes(l.code));
        setChosen(picked);

        // 0. Record the submission, so any correction below points at a
        // real lesson row rather than a placeholder (ARCHITECTURE.md §3).
        const lesson = await createLesson({
          sourceText: hindiText,
          sourceType,
          languages: selectedLangs,
        });
        if (cancelled) return;
        setLessonId(lesson.id);

        // Speak one language and record the outcome. A failure is stored
        // against that language, never thrown — one checkpoint failing
        // must not lose everybody else's results.
        async function speakInto(language, text) {
          setStage("Generating " + language.name + " audio…");
          try {
            const result = await speak(text, language.code);
            if (cancelled) return;
            setAudio((prev) => ({
              ...prev,
              [language.code]: { ...result, text },
            }));
          } catch (e) {
            if (cancelled) return;
            setAudio((prev) => ({
              ...prev,
              [language.code]: { kind: "error", error: e.message },
            }));
          }
        }

        // 1. Speak the languages that do not need the LLM, first. The
        // phrase bank is keyed on the teacher's own Hindi; if the
        // sentence is not in it, /speak refuses and that refusal is
        // rendered as a refusal.
        for (const language of picked.filter(speaksWithoutPedagogy)) {
          await speakInto(language, hindiText);
          if (cancelled) return;
        }

        // 2. Simplify. Hindi to Hindi; no boundary crossed. Everything
        // above is already on screen if this fails.
        setStage("Simplifying the lesson…");
        let simplified = null;
        try {
          simplified = await simplify(hindiText);
          if (cancelled) return;
          setAdapted(simplified);
        } catch (e) {
          if (cancelled) return;
          setSimplifyError(e.message);
        }

        // 3. Translate — only languages with a real model behind them,
        // and only if there is adapted text to translate. Translating the
        // unsimplified sentence instead would produce exactly the broken
        // output the pedagogy step exists to prevent (PLAN.md Phase 8.5).
        if (simplified) {
          for (const language of picked) {
            const target = translateTargetFor(language);
            if (!target) continue; // phrase-bank language: never translated
            setStage("Translating into " + language.name + "…");
            for (const sentence of simplified.adapted_hindi) {
              const result = await translate(sentence, target);
              if (cancelled) return;
              translated.push({
                code: language.code,
                name: language.name,
                sentence,
                translated: result.translated,
                contaminated: result.script_contamination,
              });
              setTranslations([...translated]);
            }
          }
        }

        // 4. Speak anything that has both a translation and a voice.
        // Nothing does today — Santali has no TTS checkpoint — but the
        // step is here so adding one needs no new wiring.
        for (const language of picked) {
          if (language.tts !== "full" || speaksWithoutPedagogy(language)) continue;
          const mine = translated.filter((t) => t.code === language.code);
          if (!mine.length) continue;
          await speakInto(language, mine.map((t) => t.translated).join(" "));
          if (cancelled) return;
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
  }, [hindiText, sourceType, selectedLangs]);

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
    <section>
      <h2>3. The lesson</h2>

      {stage && <p className="stage">{stage}</p>}
      {error && <p className="error">{error}</p>}

      {simplifyError && (
        <div className="group">
          <h3>Simplified Hindi</h3>
          <p className="error">
            The lesson could not be simplified this time. {simplifyError}
          </p>
          <p className="note">
            Anything below that does not need this step is unaffected.
          </p>
        </div>
      )}

      {adapted && (
        <div className="group">
          <h3>Simplified Hindi</h3>
          <p className="group-blurb">
            {adapted.concept} — rewritten for a child who does not speak Hindi
            at home. Still Hindi; nothing is translated yet.
          </p>
          <ol>
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
          <div
            key={language.code}
            className={"group chip-" + language.translation}
          >
            <h3>{language.name}</h3>

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
                <ol>
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
                <p>What BOLI can say in {language.name} today:</p>
                <ul>
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
          </div>
        );
      })}

      <button onClick={onBack}>Back</button>
    </section>
  );
}
