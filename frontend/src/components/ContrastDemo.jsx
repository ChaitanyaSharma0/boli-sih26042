import { useState } from "react";
import { translate } from "../api";
import { SANTALI_TARGET, VERIFIED_CONTRAST } from "../capability";

// The demo control for PRD.md §5's central finding: IndicTrans2 breaks on
// vocabulary outside its Santali training data, and adapting the wording
// fixes it.
//
// The two sentences are HARDCODED and were checked against the live API
// (PLAN.md Phase 8). They are deliberately not produced by calling
// /simplify: the LLM is not deterministic, and it can return a sentence
// that contaminates — measured in Phase 3, where one of two adapted
// sentences leaked Meetei Mayek on धान. A demo control that sometimes
// fails to demonstrate the thing it exists to demonstrate is worse than
// no control.
//
// The translations themselves ARE live: each button really calls
// /translate. What is fixed is the input pair, and the label says exactly
// that. Showing a canned output string would be the dishonest version.
export default function ContrastDemo() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({});
  const [busy, setBusy] = useState("");

  async function run(example) {
    setBusy(example.key);
    try {
      const result = await translate(example.hindi, SANTALI_TARGET);
      setResults((prev) => ({ ...prev, [example.key]: result }));
    } catch (e) {
      setResults((prev) => ({ ...prev, [example.key]: { error: e.message } }));
    } finally {
      setBusy("");
    }
  }

  if (!open) {
    return (
      <button className="link" onClick={() => setOpen(true)}>
        Why simplifying matters — see the verified example
      </button>
    );
  }

  return (
    <div className="group demo">
      <h3>Verified example</h3>
      <p className="group-blurb">
        These two Hindi sentences are fixed, and we have checked what they
        produce. The Santali below is generated live by the model each time
        you press a button — only the input is fixed, not the output.
      </p>

      {VERIFIED_CONTRAST.map((example) => {
        const result = results[example.key];
        return (
          <div key={example.key} className="demo-case">
            <p>
              <strong>{example.label}</strong>
              <br />
              {example.hindi}
            </p>
            <p className="note">{example.why}</p>
            <button onClick={() => run(example)} disabled={busy !== ""}>
              {busy === example.key ? "Translating…" : "Translate into Santali"}
            </button>

            {result?.error && <p className="error">{result.error}</p>}
            {result?.translated && (
              <>
                <p lang="sat">{result.translated}</p>
                {result.script_contamination ? (
                  <p className="warn">
                    Broken: part of this line is in Meetei Mayek, not Ol Chiki.
                    The model met a word it does not know and fell back to a
                    different script. A child reading this sees nonsense.
                  </p>
                ) : (
                  <p className="note">
                    Clean: all Ol Chiki. Same lesson, wording the model knows.
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}

      <p className="note">
        Neither line has been checked by a Santali speaker for meaning. What
        is verified here is the script behaviour, not the translation quality.
      </p>
      <button className="link" onClick={() => setOpen(false)}>
        Hide
      </button>
    </div>
  );
}
