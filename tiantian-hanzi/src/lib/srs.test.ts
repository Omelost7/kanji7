import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY, HOUR, nextReviewAt, nextStage, stageInfo } from "./srs.ts";

test("correct answers climb one stage and stop at burned", () => {
  assert.equal(nextStage(1, true), 2);
  assert.equal(nextStage(4, true), 5);
  assert.equal(nextStage(8, true), 9);
  assert.equal(nextStage(9, true), 9);
});

test("apprentice drops one stage, guru and above drop two", () => {
  assert.equal(nextStage(4, false), 3);
  assert.equal(nextStage(2, false), 1);
  assert.equal(nextStage(1, false), 1);
  assert.equal(nextStage(5, false), 3);
  assert.equal(nextStage(7, false), 5);
  assert.equal(nextStage(9, false), 7);
});

test("intervals match the nine-stage ladder", () => {
  assert.equal(stageInfo(1).interval, 4 * HOUR);
  assert.equal(stageInfo(2).interval, 8 * HOUR);
  assert.equal(stageInfo(3).interval, 1 * DAY);
  assert.equal(stageInfo(4).interval, 2 * DAY);
  assert.equal(stageInfo(5).interval, 7 * DAY);
  assert.equal(stageInfo(6).interval, 14 * DAY);
  assert.equal(stageInfo(7).interval, 30 * DAY);
  assert.equal(stageInfo(8).interval, 120 * DAY);
  assert.equal(stageInfo(9).interval, null);
});

test("burned items never come back", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(nextReviewAt(9, now), null);
  assert.deepEqual(nextReviewAt(1, now), new Date("2026-01-01T04:00:00Z"));
});
