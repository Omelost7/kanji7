import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemTile, StageBadge, TypePill } from "@/components/item-visuals";
import { LessonCard } from "@/components/lesson-session";
import { dependentsOf, getItem, toQuizItem } from "@/lib/content";
import { stageInfo } from "@/lib/srs";
import { getItemStatus } from "@/server/study";

export const dynamic = "force-dynamic";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getItem(decodeURIComponent(id));
  if (!item) notFound();

  const status = await getItemStatus(item.id);
  const unlocks = dependentsOf(item.id);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TypePill type={item.type} />
          <span className="text-xs text-ink-faint">Level {item.level}</span>
        </div>
        {status.state === "learning" ? (
          <div className="flex items-center gap-3">
            <StageBadge stage={status.progress.srsStage} />
            <span className="text-xs text-ink-faint">
              {status.progress.nextReviewAt
                ? `next review ${status.progress.nextReviewAt.toLocaleString()}`
                : "burned — no more reviews"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-ink-faint">
            {status.state === "available"
              ? "Unlocked — available in lessons"
              : status.blockedBy.length > 0
                ? `Locked until ${status.blockedBy.map((blocker) => blocker.glyph).join(" ")} reach Guru`
                : "Locked"}
          </span>
        )}
      </div>

      <LessonCard item={toQuizItem(item)} />

      {status.state === "learning" ? (
        <section className="mt-10 rounded-xl border border-line bg-surface p-5 text-sm">
          <h2 className="text-xs uppercase tracking-wide text-ink-faint">Your progress</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-faint">Stage</dt>
              <dd>{stageInfo(status.progress.srsStage).name}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Meaning</dt>
              <dd>
                {status.progress.meaningCorrect} right / {status.progress.meaningIncorrect} wrong
              </dd>
            </div>
            {item.type !== "component" ? (
              <div>
                <dt className="text-xs text-ink-faint">Reading</dt>
                <dd>
                  {status.progress.readingCorrect} right / {status.progress.readingIncorrect} wrong
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-ink-faint">Started</dt>
              <dd>{status.progress.startedAt.toLocaleDateString()}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {unlocks.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-wide text-ink-faint">Used in</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {unlocks.map((used) => (
              <ItemTile key={used.id} item={used} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-12">
        <Link href="/levels" className="text-sm text-ink-soft hover:text-ink">
          ← All levels
        </Link>
      </div>
    </div>
  );
}
