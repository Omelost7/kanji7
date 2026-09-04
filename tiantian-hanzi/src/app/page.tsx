import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { ItemTile, stageColor, TYPE_COLOR, TYPE_LABEL } from "@/components/item-visuals";
import { UpcomingChart } from "@/components/upcoming-chart";
import type { ItemType } from "@/lib/content";
import { stageInfo } from "@/lib/srs";
import { getDashboard, type ItemStatus } from "@/server/study";

export const dynamic = "force-dynamic";

function subtitleFor(status: ItemStatus): string {
  if (status.state === "learning") return stageInfo(status.progress.srsStage).name;
  if (status.state === "available") return "Ready to learn";
  const blockers = status.blockedBy.map((item) => item.glyph).join(" ");
  return blockers ? `Needs ${blockers}` : "Locked";
}

export default async function DashboardPage() {
  const dashboard = await getDashboard();
  const { levelProgress: level, user } = dashboard;

  const grouped: { type: ItemType; items: ItemStatus[] }[] = (
    ["component", "character", "word"] as ItemType[]
  ).map((type) => ({ type, items: dashboard.levelItems.filter((status) => status.item.type === type) }));

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-faint">
              Level {user.currentLevel} of {dashboard.maxLevel}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {level.passed} of {level.total} characters at Guru
            </h1>
          </div>
          <p className="text-sm text-ink-soft">
            {level.percent}% — you advance at {level.threshold}%
          </p>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-sunk" role="presentation">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, level.percent)}%`,
              backgroundColor: "var(--color-character)",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          {dashboard.totals.learned} of {dashboard.totals.total} items started overall.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/lessons"
          className="group rounded-xl border border-line bg-surface p-6 transition hover:border-line-strong hover:shadow-sm"
        >
          <p className="text-sm text-ink-faint">Lessons</p>
          <p className="mt-2 text-4xl font-semibold" style={{ color: TYPE_COLOR.component }}>
            {dashboard.lessonsAvailable}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {dashboard.lessonsAvailable > 0 ? "New items unlocked and waiting" : "Nothing new until more items reach Guru"}
          </p>
        </Link>

        <Link
          href="/reviews"
          className="group rounded-xl border border-line bg-surface p-6 transition hover:border-line-strong hover:shadow-sm"
        >
          <p className="text-sm text-ink-faint">Reviews available now</p>
          <p className="mt-2 text-4xl font-semibold" style={{ color: TYPE_COLOR.character }}>
            {dashboard.reviewsAvailable}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {dashboard.reviewsAvailable > 0 ? (
              "Waiting for you now"
            ) : (
              <>
                Next review in <Countdown iso={dashboard.nextReviewAt?.toISOString() ?? null} />
              </>
            )}
          </p>
        </Link>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <UpcomingChart
          availableNow={dashboard.reviewsAvailable}
          buckets={dashboard.upcoming.map((bucket) => ({
            hour: bucket.hour.toISOString(),
            count: bucket.count,
            cumulative: bucket.cumulative,
          }))}
        />
      </section>

      <section>
        <h2 className="text-sm font-medium">Items by SRS stage</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {dashboard.stageCounts.map((group) => (
            <div key={group.key} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stageColor(
                  { apprentice: 1, guru: 5, master: 7, enlightened: 8, burned: 9 }[group.key as
                    | "apprentice"
                    | "guru"
                    | "master"
                    | "enlightened"
                    | "burned"],
                ) }} />
                <span className="text-xs text-ink-soft">{group.label}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{group.count}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Level {user.currentLevel} items</h2>
          <Link href="/levels" className="text-xs text-ink-soft hover:text-ink">
            Browse all levels →
          </Link>
        </div>
        <div className="mt-4 space-y-6">
          {grouped.map(({ type, items }) =>
            items.length === 0 ? null : (
              <div key={type}>
                <h3 className="mb-2 text-xs uppercase tracking-wide" style={{ color: TYPE_COLOR[type] }}>
                  {TYPE_LABEL[type]}s
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                  {items.map((status) => (
                    <ItemTile
                      key={status.item.id}
                      item={status.item}
                      subtitle={subtitleFor(status)}
                      dimmed={status.state === "locked"}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
