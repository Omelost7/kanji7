/**
 * Progress storage.
 *
 * Only learner state lives here — the items themselves come from /content.
 * Every row is scoped by userId even though the app currently runs with a
 * single local user, so adding real auth later means writing a session lookup
 * instead of a migration. Swapping SQLite for Postgres means changing the table
 * builders here (sqliteTable -> pgTable) and the client in ./index.ts; nothing
 * in src/server or the UI touches the driver directly.
 */
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currentLevel: integer("current_level").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  leveledUpAt: integer("leveled_up_at", { mode: "timestamp_ms" }),
});

export const progress = sqliteTable(
  "progress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    /** Content id, e.g. "character:好". */
    itemId: text("item_id").notNull(),
    itemType: text("item_type", { enum: ["component", "character", "word"] }).notNull(),
    level: integer("level").notNull(),
    /** 0 = lesson done is pending, 1-4 Apprentice, 5-6 Guru, 7 Master, 8 Enlightened, 9 Burned. */
    srsStage: integer("srs_stage").notNull().default(1),
    nextReviewAt: integer("next_review_at", { mode: "timestamp_ms" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    passedAt: integer("passed_at", { mode: "timestamp_ms" }),
    burnedAt: integer("burned_at", { mode: "timestamp_ms" }),
    meaningCorrect: integer("meaning_correct").notNull().default(0),
    meaningIncorrect: integer("meaning_incorrect").notNull().default(0),
    readingCorrect: integer("reading_correct").notNull().default(0),
    readingIncorrect: integer("reading_incorrect").notNull().default(0),
  },
  (table) => [
    uniqueIndex("progress_user_item").on(table.userId, table.itemId),
    index("progress_due").on(table.userId, table.nextReviewAt),
  ],
);

export const reviewEvents = sqliteTable(
  "review_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    itemId: text("item_id").notNull(),
    stageBefore: integer("stage_before").notNull(),
    stageAfter: integer("stage_after").notNull(),
    meaningIncorrect: integer("meaning_incorrect").notNull().default(0),
    readingIncorrect: integer("reading_incorrect").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("review_events_user").on(table.userId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Progress = typeof progress.$inferSelect;
