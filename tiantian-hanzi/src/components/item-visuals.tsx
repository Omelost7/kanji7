import Link from "next/link";
import type { Item, ItemType } from "@/lib/content";
import { stageInfo } from "@/lib/srs";

export const TYPE_COLOR: Record<ItemType, string> = {
  component: "var(--color-component)",
  character: "var(--color-character)",
  word: "var(--color-word)",
};

export const TYPE_LABEL: Record<ItemType, string> = {
  component: "Component",
  character: "Character",
  word: "Word",
};

/** A soft wash of the type colour, used for tiles and pills. */
export function tint(type: ItemType, amount = 10): string {
  return `color-mix(in srgb, ${TYPE_COLOR[type]} ${amount}%, white)`;
}

export function TypePill({ type }: { type: ItemType }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: tint(type, 12), color: TYPE_COLOR[type] }}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

const STAGE_COLOR: Record<string, string> = {
  lesson: "var(--color-line-strong)",
  apprentice: "var(--color-apprentice)",
  guru: "var(--color-guru)",
  master: "var(--color-master)",
  enlightened: "var(--color-enlightened)",
  burned: "var(--color-burned)",
};

/** The SRS ladder uses one sequential ramp, light (new) to dark (burned). */
export function stageColor(stage: number): string {
  return STAGE_COLOR[stageInfo(stage).group];
}

export function StageBadge({ stage }: { stage: number }) {
  const info = stageInfo(stage);
  const dark = info.group === "enlightened" || info.group === "burned" || info.group === "master";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: stageColor(stage), color: dark ? "#fbf9f5" : "#2b2721" }}
    >
      {info.name}
    </span>
  );
}

export function itemHref(item: Item): string {
  return `/items/${encodeURIComponent(item.id)}`;
}

/**
 * One item as a coloured tile. `subtitle` carries the SRS stage or lock reason,
 * so status is never conveyed by colour alone.
 */
export function ItemTile({
  item,
  subtitle,
  dimmed = false,
}: {
  item: Item;
  subtitle?: string;
  dimmed?: boolean;
}) {
  return (
    <Link
      href={itemHref(item)}
      className="flex flex-col gap-1 rounded-lg border px-3 py-2.5 transition hover:-translate-y-0.5 hover:shadow-sm"
      style={{
        borderColor: dimmed ? "var(--color-line)" : `color-mix(in srgb, ${TYPE_COLOR[item.type]} 35%, white)`,
        backgroundColor: dimmed ? "var(--color-sunk)" : tint(item.type, 9),
        opacity: dimmed ? 0.65 : 1,
      }}
    >
      <span className="hanzi text-2xl" style={{ color: dimmed ? "var(--color-ink-faint)" : TYPE_COLOR[item.type] }}>
        {item.glyph}
      </span>
      <span className="truncate text-xs text-ink-soft">{item.meaning}</span>
      {subtitle ? <span className="truncate text-[11px] text-ink-faint">{subtitle}</span> : null}
    </Link>
  );
}
