"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ItemType, QuizItem } from "@/lib/content";
import { QuizCard, type QuizKind } from "@/components/quiz-card";

const BATCH_SIZE = 5;

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

type Question = { itemId: string; kind: QuizKind };

function kindsFor(item: QuizItem): QuizKind[] {
  return item.type === "component" ? ["meaning"] : ["meaning", "reading"];
}

/**
 * Lessons in batches of five: read each item, then quiz all five before they
 * enter the SRS queue. The quiz keeps asking until every answer is right —
 * nothing is penalised here, the items simply have to be known before they
 * start their first four-hour interval.
 */
export function LessonSession({ items }: { items: QuizItem[] }) {
  const batches = useMemo(() => {
    const chunks: QuizItem[][] = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) chunks.push(items.slice(i, i + BATCH_SIZE));
    return chunks;
  }, [items]);

  const [batchIndex, setBatchIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<"learn" | "quiz" | "saving" | "done">("learn");
  const [queue, setQueue] = useState<Question[]>([]);
  const [learned, setLearned] = useState(0);
  const [leveledUpTo, setLeveledUpTo] = useState<number | null>(null);

  const batch = batches[batchIndex] ?? [];
  const itemsById = useMemo(() => new Map(batch.map((item) => [item.id, item])), [batch]);

  const startQuiz = useCallback(() => {
    setQueue(batch.flatMap((item) => kindsFor(item).map((kind) => ({ itemId: item.id, kind }))));
    setPhase("quiz");
  }, [batch]);

  const finishBatch = useCallback(async () => {
    setPhase("saving");
    const response = await fetch("/api/lessons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemIds: batch.map((item) => item.id) }),
    });
    const result = (await response.json()) as { started: string[]; leveledUpTo: number | null };
    setLearned((count) => count + result.started.length);
    if (result.leveledUpTo) setLeveledUpTo(result.leveledUpTo);

    if (batchIndex + 1 < batches.length) {
      setBatchIndex((index) => index + 1);
      setCardIndex(0);
      setPhase("learn");
    } else {
      setPhase("done");
    }
  }, [batch, batchIndex, batches.length]);

  const handleAnswered = useCallback(
    (correct: boolean) => {
      const [question, ...rest] = queue;
      if (!question) return;
      if (!correct) {
        const position = Math.min(rest.length, 2);
        setQueue([...rest.slice(0, position), question, ...rest.slice(position)]);
        return;
      }
      setQueue(rest);
      if (rest.length === 0) void finishBatch();
    },
    [queue, finishBatch],
  );

  // Arrow keys and Enter move through the lesson cards.
  useEffect(() => {
    if (phase !== "learn") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        if (cardIndex + 1 < batch.length) setCardIndex((index) => index + 1);
        else startQuiz();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setCardIndex((index) => Math.max(0, index - 1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, cardIndex, batch.length, startQuiz]);

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold">Lessons finished</h1>
        <p className="mt-3 text-ink-soft">
          {learned} new item{learned === 1 ? "" : "s"} entered your review queue at Apprentice 1. The first review is
          in four hours.
        </p>
        {leveledUpTo ? (
          <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
            You reached <strong>level {leveledUpTo}</strong>.
          </p>
        ) : null}
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="rounded-lg bg-ink px-5 py-2.5 text-sm text-paper">
            Back to dashboard
          </Link>
          <Link href="/lessons" className="rounded-lg border border-line px-5 py-2.5 text-sm">
            More lessons
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "saving") {
    return <p className="text-center text-sm text-ink-faint">Saving…</p>;
  }

  if (phase === "quiz") {
    const current = queue[0];
    const item = current ? itemsById.get(current.itemId) : undefined;
    if (!item || !current) return <p className="text-center text-sm text-ink-faint">Saving…</p>;
    return (
      <div className="mx-auto max-w-xl">
        <QuizCard
          key={`${current.itemId}-${current.kind}-${queue.length}`}
          item={item}
          kind={current.kind}
          onAnswered={handleAnswered}
          headline={`Quick check on these ${batch.length} before they enter your reviews`}
          progressLabel={`${queue.length} left`}
        />
      </div>
    );
  }

  const item = batch[cardIndex];
  if (!item) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>
          Batch {batchIndex + 1} of {batches.length}
        </span>
        <span>
          {cardIndex + 1} / {batch.length}
        </span>
      </div>

      <LessonCard item={item} />

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCardIndex((index) => Math.max(0, index - 1))}
          disabled={cardIndex === 0}
          className="rounded-lg border border-line px-4 py-2.5 text-sm disabled:opacity-40"
        >
          ← Back
        </button>
        <p className="text-xs text-ink-faint">← → to move · Enter to continue</p>
        <button
          type="button"
          autoFocus
          onClick={() => (cardIndex + 1 < batch.length ? setCardIndex((index) => index + 1) : startQuiz())}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm text-paper"
        >
          {cardIndex + 1 < batch.length ? "Next →" : `Quiz these ${batch.length}`}
        </button>
      </div>
    </div>
  );
}

/** The teaching screen: the character large, its parts, then both mnemonics. */
export function LessonCard({ item }: { item: QuizItem }) {
  const color = TYPE_COLOR[item.type];
  return (
    <article className="mt-4">
      <div
        className="flex flex-col items-center rounded-2xl py-12"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, white)` }}
      >
        <span className="text-xs uppercase tracking-wide" style={{ color }}>
          {TYPE_LABEL[item.type]}
        </span>
        <span className="hanzi mt-4 text-8xl" style={{ color }}>
          {item.glyph}
        </span>
        <p className="mt-6 text-2xl font-medium">{item.meaning}</p>
        {item.reading ? <p className="mt-1 text-xl text-ink-soft">{item.reading}</p> : null}
        {item.acceptedMeanings.length > 1 ? (
          <p className="mt-2 text-xs text-ink-faint">also accepts: {item.acceptedMeanings.slice(1).join(", ")}</p>
        ) : null}
      </div>

      {item.parts.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-wide text-ink-faint">
            {item.type === "word" ? "Characters" : "Components"}
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {item.parts.map((part, index) => (
              <div
                key={`${part.glyph}-${index}`}
                className="flex items-center gap-3 rounded-lg border px-4 py-2.5"
                style={{
                  borderColor: `color-mix(in srgb, ${TYPE_COLOR[part.type]} 30%, white)`,
                  backgroundColor: `color-mix(in srgb, ${TYPE_COLOR[part.type]} 8%, white)`,
                }}
              >
                <span className="hanzi text-2xl" style={{ color: TYPE_COLOR[part.type] }}>
                  {part.glyph}
                </span>
                <span className="text-sm text-ink-soft">{part.meaning}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="text-xs uppercase tracking-wide text-ink-faint">Meaning mnemonic</h2>
          <p className="mt-2 leading-relaxed">{item.meaningMnemonic}</p>
        </div>
        {item.readingMnemonic ? (
          <div>
            <h2 className="text-xs uppercase tracking-wide text-ink-faint">Reading mnemonic</h2>
            <p className="mt-2 leading-relaxed">{item.readingMnemonic}</p>
          </div>
        ) : null}
      </section>
    </article>
  );
}
