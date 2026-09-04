import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { ReviewSession } from "@/components/review-session";
import { toQuizItem } from "@/lib/content";
import { getDashboard, getReviewQueue } from "@/server/study";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const queue = await getReviewQueue();

  if (queue.length === 0) {
    const dashboard = await getDashboard();
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold">Nothing due</h1>
        <p className="mt-3 text-ink-soft">
          Your next review is in <Countdown iso={dashboard.nextReviewAt?.toISOString() ?? null} />.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="rounded-lg bg-ink px-5 py-2.5 text-sm text-paper">
            Back to dashboard
          </Link>
          {dashboard.lessonsAvailable > 0 ? (
            <Link href="/lessons" className="rounded-lg border border-line px-5 py-2.5 text-sm">
              {dashboard.lessonsAvailable} lessons waiting
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  // The order is randomised once here, on the server, so hydration stays stable.
  return <ReviewSession items={queue.map(toQuizItem)} seed={Math.floor(Math.random() * 2 ** 31)} />;
}
