import { NextResponse } from "next/server";
import { toQuizItem } from "@/lib/content";
import { getReviewQueue, submitReview } from "@/server/study";

export const dynamic = "force-dynamic";

export async function GET() {
  const queue = await getReviewQueue();
  return NextResponse.json({ items: queue.map(toQuizItem) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    itemId?: unknown;
    meaningIncorrect?: unknown;
    readingIncorrect?: unknown;
  };
  if (typeof body.itemId !== "string") {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const toCount = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

  try {
    const outcome = await submitReview(body.itemId, {
      meaning: toCount(body.meaningIncorrect),
      reading: toCount(body.readingIncorrect),
    });
    return NextResponse.json({
      ...outcome,
      nextReviewAt: outcome.nextReviewAt?.toISOString() ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
