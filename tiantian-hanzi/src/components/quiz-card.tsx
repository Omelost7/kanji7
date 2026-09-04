"use client";

import { useEffect, useRef, useState } from "react";
import type { ItemType, QuizItem } from "@/lib/content";
import { checkMeaning } from "@/lib/answer";
import { checkReading, numberedToToneMarks, toneDiff } from "@/lib/pinyin";

export type QuizKind = "meaning" | "reading";

const TYPE_COLOR: Record<ItemType, string> = {
  component: "var(--color-component)",
  character: "var(--color-character)",
  word: "var(--color-word)",
};

const TYPE_LABEL: Record<ItemType, string> = {
  component: "Component",
  character: "Character",
  word: "Word",
};

type Revealed =
  | { kind: "meaning" }
  | { kind: "reading"; given: string; wrongToneOf: string | null };

/**
 * One question. Meaning answers within a typo of a correct answer shake and let
 * the learner retype; anything else wrong reveals the answer (and the mnemonic)
 * before moving on. Everything is driven with Enter.
 */
export function QuizCard({
  item,
  kind,
  onAnswered,
  progressLabel,
  headline,
}: {
  item: QuizItem;
  kind: QuizKind;
  /** Called once the learner leaves the question. */
  onAnswered: (correct: boolean) => void;
  progressLabel?: string;
  headline?: string;
}) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  // A fresh question means a fresh, focused, empty input.
  useEffect(() => {
    setValue("");
    setRevealed(null);
    setShake(false);
    setFlash(false);
    inputRef.current?.focus();
  }, [item.id, kind]);

  useEffect(() => {
    if (revealed) continueRef.current?.focus();
  }, [revealed]);

  const accepted = kind === "meaning" ? item.acceptedMeanings : item.acceptedReadings;

  function submit() {
    if (revealed) return;
    if (value.trim() === "") return;

    if (kind === "meaning") {
      const verdict = checkMeaning(value, accepted);
      if (verdict === "correct") return succeed();
      if (verdict === "close") return nudge();
      setRevealed({ kind: "meaning" });
      return;
    }

    const verdict = checkReading(value, accepted);
    if (verdict.result === "correct") return succeed();
    setRevealed({
      kind: "reading",
      given: value,
      wrongToneOf: verdict.result === "wrong-tone" ? verdict.matched : null,
    });
  }

  function succeed() {
    setFlash(true);
    setTimeout(() => {
      setFlash(false);
      onAnswered(true);
    }, 180);
  }

  /** Close enough to be a typo: shake and let them try again, no penalty. */
  function nudge() {
    setShake(true);
    setTimeout(() => setShake(false), 340);
    inputRef.current?.select();
  }

  const promptColor = TYPE_COLOR[item.type];
  const isReading = kind === "reading";

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between text-xs text-ink-faint">
        <span style={{ color: promptColor }}>
          {TYPE_LABEL[item.type]} · Level {item.level}
        </span>
        <span>{progressLabel}</span>
      </div>

      {headline ? <p className="mt-6 text-sm text-ink-faint">{headline}</p> : null}

      <div
        className="mt-6 flex w-full items-center justify-center rounded-2xl py-14"
        style={{ backgroundColor: `color-mix(in srgb, ${promptColor} 10%, white)` }}
      >
        <span className="hanzi text-7xl sm:text-8xl" style={{ color: promptColor }}>
          {item.glyph}
        </span>
      </div>

      <p className="mt-6 text-lg">
        <span className="font-medium">{TYPE_LABEL[item.type]}</span>{" "}
        <span className="text-ink-soft">{isReading ? "reading" : "meaning"}</span>
      </p>

      <div className={`mt-4 w-full max-w-md ${shake ? "animate-shake" : ""}`}>
        <input
          ref={inputRef}
          value={value}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={revealed !== null}
          lang={isReading ? "zh-Latn" : "en"}
          aria-label={isReading ? "Reading in pinyin" : "Meaning in English"}
          placeholder={isReading ? "pinyin — type ni3 or nǐ" : "meaning in English"}
          onChange={(event) =>
            // Numbered pinyin turns into tone marks as it is typed.
            setValue(isReading ? numberedToToneMarks(event.target.value) : event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          className="w-full rounded-lg border px-4 py-3 text-center text-xl outline-none transition"
          style={{
            borderColor: shake
              ? "var(--color-incorrect)"
              : flash
                ? "var(--color-correct)"
                : revealed
                  ? "var(--color-line)"
                  : "var(--color-line-strong)",
            backgroundColor: flash
              ? "color-mix(in srgb, var(--color-correct) 12%, white)"
              : revealed
                ? "color-mix(in srgb, var(--color-incorrect) 10%, white)"
                : "var(--color-surface)",
          }}
        />
        {shake ? (
          <p className="mt-2 text-center text-sm" style={{ color: "var(--color-incorrect)" }}>
            So close — check your spelling and try again.
          </p>
        ) : null}
      </div>

      {revealed ? (
        <div className="mt-6 w-full max-w-md rounded-xl border border-line bg-surface p-5 text-sm">
          <p className="text-xs uppercase tracking-wide text-ink-faint">
            {revealed.kind === "reading" && revealed.wrongToneOf ? "Right syllables, wrong tone" : "Not quite"}
          </p>

          {revealed.kind === "reading" ? (
            <ToneAnswer given={revealed.given} expected={revealed.wrongToneOf ?? item.reading ?? ""} />
          ) : (
            <p className="mt-2 text-lg font-medium">{item.acceptedMeanings.join(", ")}</p>
          )}

          <p className="mt-3 leading-relaxed text-ink-soft">
            {revealed.kind === "reading" ? item.readingMnemonic : item.meaningMnemonic}
          </p>

          <button
            ref={continueRef}
            type="button"
            onClick={() => onAnswered(false)}
            className="mt-4 w-full rounded-lg bg-ink px-4 py-2.5 text-sm text-paper"
          >
            Got it — continue (Enter)
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink-faint">
          Press Enter to answer{isReading ? " · numbers become tone marks: hao3 → hǎo" : ""}
        </p>
      )}
    </div>
  );
}

/** Shows the expected reading with the missed syllable marked. */
function ToneAnswer({ given, expected }: { given: string; expected: string }) {
  const diff = toneDiff(given, expected);
  return (
    <div className="mt-2">
      <p className="text-lg font-medium">
        {diff.map((part, index) => (
          <span
            key={`${part.syllable}-${index}`}
            className="mr-2 inline-block rounded px-1"
            style={
              part.ok
                ? undefined
                : {
                    backgroundColor: "color-mix(in srgb, var(--color-incorrect) 16%, white)",
                    color: "var(--color-incorrect)",
                  }
            }
          >
            {part.syllable}
          </span>
        ))}
      </p>
      <p className="mt-1 text-xs text-ink-faint">You wrote “{given}”.</p>
    </div>
  );
}
