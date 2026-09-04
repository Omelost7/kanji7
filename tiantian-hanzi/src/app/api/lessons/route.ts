import { NextResponse } from "next/server";
import { toQuizItem } from "@/lib/content";
import { getLessonQueue, startLessons } from "@/server/study";

export const dynamic = "force-dynamic";

export async function GET() {
  const queue = await getLessonQueue();
  return NextResponse.json({ items: queue.map(toQuizItem) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { itemIds?: unknown };
  if (!Array.isArray(body.itemIds) || body.itemIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "itemIds must be an array of item ids" }, { status: 400 });
  }

  try {
    const result = await startLessons(body.itemIds as string[]);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
