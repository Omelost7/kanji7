"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { QuizItem } from "@/lib/content";
import { QuizCard, type QuizKind } from "@/components/quiz-card";
import { StageBadge } from "@/components/item-visuals";

type Question = { itemId: string; kind: QuizKind };
type Mistakes = Record<string, { meaning: number; reading: number }>;
type Finished = { item: QuizItem; correct: boolean; stageBefore: number; stageAfter: number };

function kindsFor(item: QuizItem): QuizKind[] {
  return item.type === "component" ? ["meaning"] : ["meaning", "reading"];
}

/** Deterministic PRNG so the server and the client build the same first render. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(values: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * A review session. Meaning and reading are asked separately and both must be
 * answered correctly before the item leaves the session; a wrong answer goes to
 * the back of the queue and is asked again. The item only moves up an SRS stage
 * if nothing was missed.
 */
export function ReviewSession({ items, seed }: { items: QuizItem[]; seed: number }) {
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const [queue, setQueue] = useState<Question[]>(() =>
    shuffleWithSeed(
      items.flatMap((item) => kindsFor(item).map((kind) => ({ itemId: item.id, kind }))),
      seed,
    ),
  );
  const [finished, setFinished] = useState<Finished[]>([]);
  const [leveledUpTo, setLeveledUpTo] = useState<number | null>(null);
  const mistakes = useRef<Mistakes>({});
  const totalQuestions = useMemo(
    () => items.reduce((sum, item) => sum + kindsFor(item).length, 0),
    [items],
  );

  const submitItem = useCallback(
    async (item: QuizItem) => {
      const missed = mistakes.current[item.id] ?? { meaning: 0, reading: 0 };
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          meaningIncorrect: missed.meaning,
          readingIncorrect: missed.reading,
        }),
      });
      const outcome = (await response.json()) as {
        stageBefore: number;
        stageAfter: number;
        leveledUpTo: number | null;
      };
      if (outcome.leveledUpTo) setLeveledUpTo(outcome.leveledUpTo);
      setFinished((current) => [
        ...current,
        {
          item,
          correct: missed.meaning === 0 && missed.reading === 0,
          stageBefore: outcome.stageBefore,
          stageAfter: outcome.stageAfter,
        },
      ]);
    },
    [],
  );

  const handleAnswered = useCallback(
    (correct: boolean) => {
      const [question, ...rest] = queue;
      if (!question) return;
      const item = itemsById.get(question.itemId);
      if (!item) {
        setQueue(rest);
        return;
      }

      if (!correct) {
        const missed = mistakes.current[item.id] ?? { meaning: 0, reading: 0 };
        mistakes.current[item.id] = { ...missed, [question.kind]: missed[question.kind] + 1 };
        // Ask it again later in the same session.
        const position = Math.min(rest.length, 3);
        setQueue([...rest.slice(0, position), question, ...rest.slice(position)]);
        return;
      }

      if (!rest.some((pending) => pending.itemId === item.id)) void submitItem(item);
      setQueue(rest);
    },
    [queue, itemsById, submitItem],
  );

  if (queue.length === 0) {
    return <Summary finished={finished} leveledUpTo={leveledUpTo} />;
  }

  const current = queue[0];
  const item = itemsById.get(current.itemId);
  if (!item) return null;
  const answered = totalQuestions - queue.length;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-sunk">
        <div
          className="h-full rounded-full bg-ink transition-all"
          style={{ width: `${Math.round((answered / Math.max(totalQuestions, 1)) * 100)}%` }}
        />
      </div>
      <QuizCard
        key={`${current.itemId}-${current.kind}-${queue.length}`}
        item={item}
        kind={current.kind}
        onAnswered={handleAnswered}
        progressLabel={`${queue.length} left`}
      />
    </div>
  );
}

function Summary({ finished, leveledUpTo }: { finished: Finished[]; leveledUpTo: number | null }) {
  const correct = finished.filter((entry) => entry.correct).length;
  const accuracy = finished.length === 0 ? 0 : Math.round((correct / finished.length) * 100);

  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl font-semibold">Session finished</h1>
      <p className="mt-3 text-ink-soft">
        {correct} of {finished.length} items answered correctly — {accuracy}%.
      </p>
      {leveledUpTo ? (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          You reached <strong>level {leveledUpTo}</strong>. New lessons are waiting.
        </p>
      ) : null}

      <ul className="mt-8 divide-y divide-line rounded-xl border border-line bg-surface text-left">
        {finished.map((entry) => (
          <li key={entry.item.id} className="flex items-center gap-4 px-4 py-3">
            <span className="hanzi text-2xl">{entry.item.glyph}</span>
            <span className="flex-1 text-sm text-ink-soft">{entry.item.meaning}</span>
            <span className="text-xs" style={{ color: entry.correct ? "var(--color-correct)" : "var(--color-incorrect)" }}>
              {entry.correct ? "correct" : "missed"}
            </span>
            <StageBadge stage={entry.stageAfter} />
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-lg bg-ink px-5 py-2.5 text-sm text-paper">
          Back to dashboard
        </Link>
        <Link href="/reviews" className="rounded-lg border border-line px-5 py-2.5 text-sm">
          More reviews
        </Link>
      </div>
    </div>
  );
}
