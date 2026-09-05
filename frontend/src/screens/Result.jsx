import { useEffect, useState } from "react";
import { languages as fetchLanguages, simplify, speak, translate } from "../api";
import { translateTargetFor } from "../capability";
import AudioPlayer from "../components/AudioPlayer";
import CorrectionForm from "../components/CorrectionForm";

// Screen 3 — the lesson, adapted, translated where that is real, and
// spoken where a voice exists.
//
// The calls run in sequence, not in parallel: /simplify, then /translate
// for languages that genuinely have a model, then /speak per language
// (ARCHITECTURE.md §5). Sequential is easier to follow when one step
// fails, and fast enough for a classroom.
//
// PRD.md §4's boundary is enforced here by construction, not by a check
// that could be forgotten: translateTargetFor() returns null for every
// phrase-bank language, so the /translate request is never built for Ho,
// Mundari, Kurukh or Sadri. They reach /speak only, which matches the
// text against the curated bank and refuses anything else. The backend
// 501s them too; this is the belt to those braces.

// Nothing writes the lessons table yet — no endpoint in ARCHITECTURE.md §3
// creates a lesson row. Corrections are still worth logging, so they go in
// with lesson_id 0, meaning "no lesson row". Flagged in STATE.md.
const NO_LESSON = 0;

export default function Result({ hindiText, selectedLangs, onBack }) {
  const [stage, setStage] = useState("Loading languages…");
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState([]);
  const [adapted, setAdapted] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [audio, setAudio] = useState({});

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

        // 1. Simplify. Hindi to Hindi; no boundary crossed.
        setStage("Simplifying the lesson…");
        const simplified = await simplify(hindiText);
        if (cancelled) return;
        setAdapted(simplified);

        // 2. Translate — only languages with a real model behind them.
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
            });
            setTranslations([...translated]);
          }
        }

        // 3. Speak — only languages that have a voice at all.
        for (const language of picked) {
          if (language.tts !== "full") continue; // Santali has no voice
          setStage("Generating " + language.name + " audio…");

          // Speak the translation when a real one exists; otherwise send
          // the teacher's own Hindi, which is what the phrase bank is
          // keyed on. If it is not a bank phrase, /speak refuses and says
          // so, and that refusal is rendered as a refusal.
          const mine = translated.filter((t) => t.code === language.code);
          const text = mine.length
            ? mine.map((t) => t.translated).join(" ")
            : hindiText;

          try {
            const result = await speak(text, language.code);
            if (cancelled) return;
            setAudio((prev) => ({
              ...prev,
              [language.code]: { ...result, text },
            }));
          } catch (e) {
            if (cancelled) return;
            // One language failing must not lose the others.
            setAudio((prev) => ({
              ...prev,
              [language.code]: { kind: "error", error: e.message },
            }));
          }
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
  }, [hindiText, selectedLangs]);

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

            {mine.length > 0 && (
              <>
                <ol>
                  {mine.map((t, i) => (
                    <li key={i} lang={language.code}>
                      {t.translated}
                    </li>
                  ))}
                </ol>
                <CorrectionForm
                  lang={language.code}
                  original={mine.map((t) => t.translated).join(" ")}
                  lessonId={NO_LESSON}
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
                    lessonId={NO_LESSON}
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
