/** The nine-stage SRS ladder. Stage 0 means "unlocked, lesson not done yet". */

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export type StageGroup = "lesson" | "apprentice" | "guru" | "master" | "enlightened" | "burned";

export type StageInfo = {
  stage: number;
  name: string;
  short: string;
  group: StageGroup;
  /** Wait until the next review once an item lands on this stage. null = never again. */
  interval: number | null;
};

export const STAGES: StageInfo[] = [
  { stage: 0, name: "Lesson", short: "Lesson", group: "lesson", interval: null },
  { stage: 1, name: "Apprentice 1", short: "App 1", group: "apprentice", interval: 4 * HOUR },
  { stage: 2, name: "Apprentice 2", short: "App 2", group: "apprentice", interval: 8 * HOUR },
  { stage: 3, name: "Apprentice 3", short: "App 3", group: "apprentice", interval: 1 * DAY },
  { stage: 4, name: "Apprentice 4", short: "App 4", group: "apprentice", interval: 2 * DAY },
  { stage: 5, name: "Guru 1", short: "Guru 1", group: "guru", interval: 7 * DAY },
  { stage: 6, name: "Guru 2", short: "Guru 2", group: "guru", interval: 14 * DAY },
  { stage: 7, name: "Master", short: "Master", group: "master", interval: 30 * DAY },
  { stage: 8, name: "Enlightened", short: "Enlight", group: "enlightened", interval: 120 * DAY },
  { stage: 9, name: "Burned", short: "Burned", group: "burned", interval: null },
];

export const GURU_STAGE = 5;
export const BURNED_STAGE = 9;

export function stageInfo(stage: number): StageInfo {
  return STAGES[Math.min(Math.max(stage, 0), BURNED_STAGE)];
}

export function isPassed(stage: number): boolean {
  return stage >= GURU_STAGE;
}

/**
 * Apply one graded answer.
 * Correct moves up a stage; incorrect drops one stage from Apprentice and two
 * from Guru or above (never below Apprentice 1).
 */
export function nextStage(stage: number, correct: boolean): number {
  if (correct) return Math.min(stage + 1, BURNED_STAGE);
  const penalty = stage >= GURU_STAGE ? 2 : 1;
  return Math.max(stage - penalty, 1);
}

/** When the item comes back, given the stage it just landed on. */
export function nextReviewAt(stage: number, now: Date = new Date()): Date | null {
  const interval = stageInfo(stage).interval;
  if (interval === null) return null;
  return new Date(now.getTime() + interval);
}

export const STAGE_GROUPS: { key: StageGroup; label: string; stages: number[] }[] = [
  { key: "apprentice", label: "Apprentice", stages: [1, 2, 3, 4] },
  { key: "guru", label: "Guru", stages: [5, 6] },
  { key: "master", label: "Master", stages: [7] },
  { key: "enlightened", label: "Enlightened", stages: [8] },
  { key: "burned", label: "Burned", stages: [9] },
];
