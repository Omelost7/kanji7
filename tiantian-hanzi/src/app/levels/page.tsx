import { ItemTile, TYPE_COLOR, TYPE_LABEL } from "@/components/item-visuals";
import { type ItemType, MAX_LEVEL } from "@/lib/content";
import { stageInfo } from "@/lib/srs";
import { getAllStatuses, getUser, type ItemStatus } from "@/server/study";

export const dynamic = "force-dynamic";

function subtitleFor(status: ItemStatus): string {
  if (status.state === "learning") return stageInfo(status.progress.srsStage).name;
  if (status.state === "available") return "Ready to learn";
  return status.blockedBy.length > 0 ? `Needs ${status.blockedBy.map((item) => item.glyph).join(" ")}` : "Locked";
}

export default async function LevelsPage() {
  const [user, statuses] = await Promise.all([getUser(), getAllStatuses()]);
  const levels = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);
  const types: ItemType[] = ["component", "character", "word"];

  return (
    <div className="space-y-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">All levels</h1>
        <p className="mt-2 text-sm text-ink-soft">
          You are on level {user.currentLevel}. Locked items list what they are waiting on.
        </p>
      </header>

      {levels.map((level) => {
        const inLevel = statuses.filter((status) => status.item.level === level);
        const started = inLevel.filter((status) => status.state === "learning").length;
        return (
          <section key={level}>
            <div className="flex items-baseline justify-between border-b border-line pb-2">
              <h2 className="text-lg font-medium">
                Level {level}
                {level === user.currentLevel ? <span className="ml-2 text-xs text-ink-faint">current</span> : null}
              </h2>
              <p className="text-xs text-ink-faint">
                {started} of {inLevel.length} started
              </p>
            </div>
            <div className="mt-5 space-y-5">
              {types.map((type) => {
                const items = inLevel.filter((status) => status.item.type === type);
                if (items.length === 0) return null;
                return (
                  <div key={type}>
                    <h3 className="mb-2 text-xs uppercase tracking-wide" style={{ color: TYPE_COLOR[type] }}>
                      {TYPE_LABEL[type]}s ({items.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-9">
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
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
