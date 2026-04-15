import { db } from "./db";

export function migrate() {
  db.exec(/* sql */ `
    CREATE TABLE IF NOT EXISTS ai_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS ai_short_term_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_short_term_created_at ON ai_short_term_memories(created_at);
  `);
}
