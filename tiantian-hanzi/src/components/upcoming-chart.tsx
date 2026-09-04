"use client";

import { useState } from "react";

export type Bucket = { hour: string; count: number; cumulative: number };

const CHART_HEIGHT = 112;

function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric" });
}

/**
 * Reviews arriving over the next 24 hours: one bar per hour, single series, so
 * no legend. Hovering (or focusing) a bar gives the exact count and the running
 * total; the same numbers are in a screen-reader table underneath.
 */
export function UpcomingChart({ buckets, availableNow }: { buckets: Bucket[]; availableNow: number }) {
  const [active, setActive] = useState<number | null>(null);
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <figure className="m-0">
      <figcaption className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-ink">Coming up over 24 hours</h2>
        <span className="text-xs text-ink-faint">
          {total} review{total === 1 ? "" : "s"} scheduled
        </span>
      </figcaption>

      <div className="relative">
        {total === 0 ? (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-ink-faint">
            Nothing scheduled in the next 24 hours.
          </p>
        ) : null}
        {active !== null ? (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs shadow-sm"
            style={{ left: `${((active + 0.5) / buckets.length) * 100}%`, transform: "translate(-50%, -100%)" }}
          >
            <div className="font-medium text-ink">
              {buckets[active].count} new at {hourLabel(buckets[active].hour)}
            </div>
            <div className="text-ink-faint">{buckets[active].cumulative} waiting in total</div>
          </div>
        ) : null}

        <div className="flex items-end gap-[2px]" style={{ height: CHART_HEIGHT }}>
          {buckets.map((bucket, index) => (
            <button
              key={bucket.hour}
              type="button"
              tabIndex={bucket.count > 0 ? 0 : -1}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${bucket.count} reviews at ${hourLabel(bucket.hour)}`}
              className="group flex h-full flex-1 cursor-default items-end"
            >
              <span
                className="w-full rounded-t transition-colors"
                style={{
                  height: bucket.count === 0 ? 2 : `${Math.max(6, (bucket.count / peak) * CHART_HEIGHT)}px`,
                  backgroundColor:
                    bucket.count === 0
                      ? "var(--color-line)"
                      : active === index
                        ? "var(--color-ink)"
                        : "var(--color-ink-soft)",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between border-t border-line pt-2 text-[11px] text-ink-faint">
        <span>now{availableNow > 0 ? ` · ${availableNow} waiting` : ""}</span>
        <span>{hourLabel(buckets[6]?.hour ?? buckets[0].hour)}</span>
        <span>{hourLabel(buckets[12]?.hour ?? buckets[0].hour)}</span>
        <span>{hourLabel(buckets[18]?.hour ?? buckets[0].hour)}</span>
        <span>+24h</span>
      </div>

      <table className="sr-only">
        <caption>Reviews scheduled per hour over the next 24 hours</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">New reviews</th>
            <th scope="col">Total waiting</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.hour}>
              <th scope="row">{hourLabel(bucket.hour)}</th>
              <td>{bucket.count}</td>
              <td>{bucket.cumulative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
