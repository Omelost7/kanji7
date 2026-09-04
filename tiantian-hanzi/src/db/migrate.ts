/** Applies migrations and creates the local user. Run with `npm run db:migrate`. */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const dbPath = process.env.DATABASE_URL ?? path.join(process.cwd(), "data", "tiantian.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.prepare("INSERT OR IGNORE INTO users (id, name, current_level) VALUES (?, ?, 1)").run("local", "Local learner");
sqlite.close();

console.log(`Database ready at ${dbPath}`);
