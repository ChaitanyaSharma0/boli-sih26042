import {
  PHRASE_BANK_NOTE,
  nativeName,
  phraseForLabel,
} from "../capability";
import AudioPlayer from "./AudioPlayer";
import CorrectionForm from "./CorrectionForm";

// One language's result: its capability edge and badge, its audio, its
// translation, and the honesty notes that go with them.
//
// Used by both single-sentence mode and chapter mode, so the two cannot
// disagree about what a language can do. Capability comes from the API's
// `translation` field, never the language code (RULES.md §5).
//
// onPlayPhrase is optional: without it (chapter mode, which has no
// per-sentence playback state) a refusal shows its reason and no options.
//
// headingLevel keeps the outline unbroken: 2 under the page title in
// single-sentence mode, 3 under each sentence heading in chapter mode.
export default function LanguageResult({
  language,
  spoken,
  translations,
  simplifyFailed,
  lessonId,
  onPlayPhrase,
  headingLevel = 2,
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const isBank = language.translation === "phrase_bank";
  const native = nativeName(language);

  return (
    <article
      className={`result cap-${language.translation}`}
      aria-label={`${language.name} result`}
    >
      <div className="result-head">
        <Heading>{language.name}</Heading>
        {native && (
          <span className="in-script" lang={language.code}>
            {native}
          </span>
        )}
        <span className="badge">
          {isBank ? "Phrase bank only" : "AI translation"}
        </span>
      </div>

      {spoken?.kind === "audio" && (
        <>
          <AudioPlayer blob={spoken.blob} label={`${language.name} audio`} />
          {spoken.textIsTarget ? (
            <p className="target-text" lang={language.code}>
              {spoken.text}
            </p>
          ) : (
            <p className="asked-for">
              {phraseForLabel(language.name)}{" "}
              <span lang="hi">{spoken.text}</span>
            </p>
          )}
          {/* Only claim something was spoken when it actually was. */}
          {isBank && <p className="section-note">{PHRASE_BANK_NOTE}</p>}
        </>
      )}

      {spoken?.kind === "phrase_bank_only" && (
        <>
          <p className="note">{spoken.reason}</p>
          {/* Only offer the bank where a phrase can be played from it. In
              chapter mode the same unplayable list repeated under every
              sentence read as if each sentence had been spoken as it. */}
          {onPlayPhrase && (
            <>
              <p className="field-label">
                What BOLI can say in {language.name} today
              </p>
              <ul className="phrase-options">
                {spoken.options.map((phrase) => (
                  <li key={phrase.id}>
                    {phrase.hindi_source} —{" "}
                    <span className="in-script" lang={language.code}>
                      {phrase.target_text}
                    </span>{" "}
                    <button
                      className="link"
                      onClick={() => onPlayPhrase(language.code, phrase)}
                    >
                      Play this one
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {spoken?.kind === "error" && (
        <p className="error">Couldn't make the audio. {spoken.error}</p>
      )}

      {simplifyFailed && !isBank && (
        <p className="error">
          No {language.name} this time: it needs the simplification step, which
          failed. The other languages here were not affected.
        </p>
      )}

      {translations.length > 0 && (
        <>
          <ol className="sentences target" lang={language.code}>
            {translations.map((t, i) => (
              <li key={i}>
                {t.translated}
                {t.contaminated && (
                  <span className="warn">
                    The model doesn't know a word in this sentence, so part of
                    this line is in the wrong script. Try simpler, more local
                    wording.
                  </span>
                )}
              </li>
            ))}
          </ol>
          <CorrectionForm
            lang={language.code}
            original={translations.map((t) => t.translated).join(" ")}
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

      {spoken?.kind === "audio" && isBank && (
        <CorrectionForm
          lang={language.code}
          original={spoken.text}
          lessonId={lessonId}
        />
      )}
    </article>
  );
}
