"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  if (ms <= 0) return "now";
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return "under a minute";
}

/** Ticking "time until next review". Rendered client-side to avoid a stale server clock. */
export function Countdown({ iso }: { iso: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!iso) return <span>—</span>;
  const target = new Date(iso).getTime();
  return <time dateTime={iso}>{format(target - now)}</time>;
}
