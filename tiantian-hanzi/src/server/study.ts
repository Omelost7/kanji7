/**
 * Everything the app knows about a learner's state.
 *
 * Route handlers and server components call these functions; nothing else
 * touches Drizzle directly, so the storage engine can change underneath.
 * Every function takes an explicit userId (defaulted to the local user) so
 * adding auth later is a matter of passing a session id in.
 */
import "server-only";
import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db, LOCAL_USER_ID, schema } from "@/db";
import type { Progress, User } from "@/db/schema";
import {
  ALL_ITEMS,
  CHARACTERS,
  type Item,
  MAX_LEVEL,
  itemsAtLevel,
  quizKinds,
  requireItem,
} from "@/lib/content";
import { BURNED_STAGE, GURU_STAGE, isPassed, nextReviewAt, nextStage, STAGE_GROUPS } from "@/lib/srs";

/** Share of a level's characters that must be at Guru or above to level up. */
export const LEVEL_UP_THRESHOLD = 0.9;

const TYPE_ORDER: Record<Item["type"], number> = { component: 0, character: 1, word: 2 };
const CONTENT_ORDER = new Map(ALL_ITEMS.map((item, index) => [item.id, index]));

function byCurriculumOrder(a: Item, b: Item): number {
  if (a.level !== b.level) return a.level - b.level;
  if (a.type !== b.type) return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  return (CONTENT_ORDER.get(a.id) ?? 0) - (CONTENT_ORDER.get(b.id) ?? 0);
}

export async function getUser(userId: string = LOCAL_USER_ID): Promise<User> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!user) throw new Error(`Unknown user: ${userId}. Run \`npm run db:migrate\`.`);
  return user;
}

export async function getProgressMap(userId: string = LOCAL_USER_ID): Promise<Map<string, Progress>> {
  const rows = await db.select().from(schema.progress).where(eq(schema.progress.userId, userId));
  return new Map(rows.map((row) => [row.itemId, row]));
}

export type ItemStatus =
  | { state: "locked"; item: Item; blockedBy: Item[] }
  | { state: "available"; item: Item }
  | { state: "learning"; item: Item; progress: Progress };

export function statusOf(item: Item, progressById: Map<string, Progress>, currentLevel: number): ItemStatus {
  const progress = progressById.get(item.id);
  if (progress) return { state: "learning", item, progress };
  const blockedBy = item.dependencyIds
    .map(requireItem)
    .filter((dependency) => !isPassed(progressById.get(dependency.id)?.srsStage ?? 0));
  if (item.level > currentLevel || blockedBy.length > 0) return { state: "locked", item, blockedBy };
  return { state: "available", item };
}

/** Items whose components/characters are all at Guru and whose level is unlocked. */
export async function getLessonQueue(userId: string = LOCAL_USER_ID): Promise<Item[]> {
  const [user, progressById] = await Promise.all([getUser(userId), getProgressMap(userId)]);
  return ALL_ITEMS.filter((item) => statusOf(item, progressById, user.currentLevel).state === "available").sort(
    byCurriculumOrder,
  );
}

export async function getReviewQueue(userId: string = LOCAL_USER_ID, now: Date = new Date()): Promise<Item[]> {
  const rows = await db
    .select()
    .from(schema.progress)
    .where(
      and(
        eq(schema.progress.userId, userId),
        isNotNull(schema.progress.nextReviewAt),
        lte(schema.progress.nextReviewAt, now),
      ),
    );
  const due = rows
    .filter((row) => row.srsStage >= 1 && row.srsStage < BURNED_STAGE)
    .sort((a, b) => (a.nextReviewAt?.getTime() ?? 0) - (b.nextReviewAt?.getTime() ?? 0))
    .map((row) => requireItem(row.itemId));
  return shuffle(due);
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Turn finished lessons into Apprentice 1 items scheduled four hours out. */
export async function startLessons(
  itemIds: string[],
  userId: string = LOCAL_USER_ID,
  now: Date = new Date(),
): Promise<{ started: string[]; leveledUpTo: number | null }> {
  const [user, progressById] = await Promise.all([getUser(userId), getProgressMap(userId)]);
  const startable = itemIds
    .map(requireItem)
    .filter((item) => statusOf(item, progressById, user.currentLevel).state === "available");

  if (startable.length > 0) {
    await db.insert(schema.progress).values(
      startable.map((item) => ({
        userId,
        itemId: item.id,
        itemType: item.type,
        level: item.level,
        srsStage: 1,
        nextReviewAt: nextReviewAt(1, now),
        startedAt: now,
      })),
    );
  }

  return { started: startable.map((item) => item.id), leveledUpTo: await applyLevelUp(userId, now) };
}

export type ReviewOutcome = {
  itemId: string;
  stageBefore: number;
  stageAfter: number;
  nextReviewAt: Date | null;
  leveledUpTo: number | null;
};

/**
 * Record one finished review. A character or word is only finished once both
 * its meaning and its reading have been answered; the item moves up a stage
 * only if neither of them was ever answered incorrectly in that session.
 */
export async function submitReview(
  itemId: string,
  mistakes: { meaning?: number; reading?: number },
  userId: string = LOCAL_USER_ID,
  now: Date = new Date(),
): Promise<ReviewOutcome> {
  const item = requireItem(itemId);
  const [row] = await db
    .select()
    .from(schema.progress)
    .where(and(eq(schema.progress.userId, userId), eq(schema.progress.itemId, itemId)));
  if (!row) throw new Error(`No progress for ${itemId} — it has not been learned yet.`);

  const meaningIncorrect = Math.max(0, mistakes.meaning ?? 0);
  const readingIncorrect = quizKinds(item).includes("reading") ? Math.max(0, mistakes.reading ?? 0) : 0;
  const correct = meaningIncorrect === 0 && readingIncorrect === 0;

  const stageBefore = row.srsStage;
  const stageAfter = nextStage(stageBefore, correct);
  const due = nextReviewAt(stageAfter, now);

  await db
    .update(schema.progress)
    .set({
      srsStage: stageAfter,
      nextReviewAt: due,
      passedAt: row.passedAt ?? (stageAfter >= GURU_STAGE ? now : null),
      burnedAt: row.burnedAt ?? (stageAfter >= BURNED_STAGE ? now : null),
      meaningCorrect: row.meaningCorrect + (meaningIncorrect === 0 ? 1 : 0),
      meaningIncorrect: row.meaningIncorrect + meaningIncorrect,
      readingCorrect: row.readingCorrect + (quizKinds(item).includes("reading") && readingIncorrect === 0 ? 1 : 0),
      readingIncorrect: row.readingIncorrect + readingIncorrect,
    })
    .where(eq(schema.progress.id, row.id));

  await db.insert(schema.reviewEvents).values({
    userId,
    itemId,
    stageBefore,
    stageAfter,
    meaningIncorrect,
    readingIncorrect,
    createdAt: now,
  });

  return {
    itemId,
    stageBefore,
    stageAfter,
    nextReviewAt: due,
    leveledUpTo: await applyLevelUp(userId, now),
  };
}

/** Level up once 90% of the current level's characters are Guru or above. */
async function applyLevelUp(userId: string, now: Date): Promise<number | null> {
  const user = await getUser(userId);
  if (user.currentLevel >= MAX_LEVEL) return null;

  const progressById = await getProgressMap(userId);
  const levelCharacters = CHARACTERS.filter((item) => item.level === user.currentLevel);
  if (levelCharacters.length === 0) return null;

  const passed = levelCharacters.filter((item) => isPassed(progressById.get(item.id)?.srsStage ?? 0)).length;
  if (passed / levelCharacters.length < LEVEL_UP_THRESHOLD) return null;

  const nextLevel = user.currentLevel + 1;
  await db
    .update(schema.users)
    .set({ currentLevel: nextLevel, leveledUpAt: now })
    .where(eq(schema.users.id, userId));
  return nextLevel;
}

export type StageCount = { key: string; label: string; count: number };
export type UpcomingBucket = { hour: Date; count: number; cumulative: number };

export type Dashboard = {
  user: User;
  maxLevel: number;
  levelProgress: { passed: number; total: number; percent: number; threshold: number };
  reviewsAvailable: number;
  lessonsAvailable: number;
  nextReviewAt: Date | null;
  upcoming: UpcomingBucket[];
  stageCounts: StageCount[];
  levelItems: ItemStatus[];
  totals: { learned: number; total: number };
};

export async function getDashboard(userId: string = LOCAL_USER_ID, now: Date = new Date()): Promise<Dashboard> {
  const [user, progressById] = await Promise.all([getUser(userId), getProgressMap(userId)]);
  const rows = [...progressById.values()];

  const levelCharacters = CHARACTERS.filter((item) => item.level === user.currentLevel);
  const passedCharacters = levelCharacters.filter((item) => isPassed(progressById.get(item.id)?.srsStage ?? 0)).length;

  const dueRows = rows.filter(
    (row) => row.nextReviewAt !== null && row.nextReviewAt <= now && row.srsStage < BURNED_STAGE,
  );
  const future = rows
    .filter((row) => row.nextReviewAt !== null && row.nextReviewAt > now)
    .sort((a, b) => (a.nextReviewAt?.getTime() ?? 0) - (b.nextReviewAt?.getTime() ?? 0));

  const lessonsAvailable = ALL_ITEMS.filter(
    (item) => statusOf(item, progressById, user.currentLevel).state === "available",
  ).length;

  // 24 hourly buckets starting at the top of the current hour.
  const startOfHour = new Date(now);
  startOfHour.setMinutes(0, 0, 0);
  let cumulative = dueRows.length;
  const upcoming: UpcomingBucket[] = Array.from({ length: 24 }, (_, index) => {
    const hour = new Date(startOfHour.getTime() + index * 60 * 60 * 1000);
    const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);
    const count = future.filter((row) => row.nextReviewAt! > hour && row.nextReviewAt! <= nextHour).length;
    cumulative += count;
    return { hour, count, cumulative };
  });

  const stageCounts: StageCount[] = STAGE_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    count: rows.filter((row) => group.stages.includes(row.srsStage)).length,
  }));

  const levelItems = itemsAtLevel(user.currentLevel)
    .sort(byCurriculumOrder)
    .map((item) => statusOf(item, progressById, user.currentLevel));

  return {
    user,
    maxLevel: MAX_LEVEL,
    levelProgress: {
      passed: passedCharacters,
      total: levelCharacters.length,
      percent: levelCharacters.length === 0 ? 0 : Math.round((passedCharacters / levelCharacters.length) * 100),
      threshold: Math.round(LEVEL_UP_THRESHOLD * 100),
    },
    reviewsAvailable: dueRows.length,
    lessonsAvailable,
    nextReviewAt: future[0]?.nextReviewAt ?? null,
    upcoming,
    stageCounts,
    levelItems,
    totals: { learned: rows.length, total: ALL_ITEMS.length },
  };
}

/** Status for a single item, used by the item detail page. */
export async function getItemStatus(itemId: string, userId: string = LOCAL_USER_ID): Promise<ItemStatus> {
  const [user, progressById] = await Promise.all([getUser(userId), getProgressMap(userId)]);
  return statusOf(requireItem(itemId), progressById, user.currentLevel);
}

/** Status for every item, used by the level browser. */
export async function getAllStatuses(userId: string = LOCAL_USER_ID): Promise<ItemStatus[]> {
  const [user, progressById] = await Promise.all([getUser(userId), getProgressMap(userId)]);
  return ALL_ITEMS.map((item) => statusOf(item, progressById, user.currentLevel)).sort((a, b) =>
    byCurriculumOrder(a.item, b.item),
  );
}

export { inArray };
