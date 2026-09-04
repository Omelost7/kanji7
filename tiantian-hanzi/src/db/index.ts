/**
 * The single place that knows which database engine is in use.
 *
 * To move to Postgres: swap better-sqlite3 for a pg pool and
 * drizzle-orm/sqlite-core for drizzle-orm/pg-core in ./schema.ts. Every caller
 * goes through the exported `db` handle and the queries in src/server.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_URL ?? path.join(process.cwd(), "data", "tiantian.db");
const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** Single local user until real auth arrives; every query is already scoped by id. */
export const LOCAL_USER_ID = "local";
export const LOCAL_USER_NAME = "Local learner";

function connect() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
  sqlite
    .prepare("INSERT OR IGNORE INTO users (id, name, current_level) VALUES (?, ?, 1)")
    .run(LOCAL_USER_ID, LOCAL_USER_NAME);
  return database;
}

// Next's dev server re-evaluates modules on every change; keep one connection.
const globalForDb = globalThis as unknown as { __tiantianDb?: ReturnType<typeof connect> };
export const db = globalForDb.__tiantianDb ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.__tiantianDb = db;

export { schema };
