import Link from "next/link";
import { LessonSession } from "@/components/lesson-session";
import { toQuizItem } from "@/lib/content";
import { getLessonQueue } from "@/server/study";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const queue = await getLessonQueue();

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold">No lessons right now</h1>
        <p className="mt-3 text-ink-soft">
          New items unlock as their components reach Guru. Come back after your next round of reviews.
        </p>
        <Link href="/" className="mt-8 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm text-paper">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <LessonSession items={queue.map(toQuizItem)} />;
}
