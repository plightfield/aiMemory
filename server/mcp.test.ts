import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { db } from "./db";
import { migrate } from "./migrate";

// Ensure tables exist
migrate();

describe("AI Memory MCP Logic Tests", () => {
  const TEST_ROLE = "测试专家";

  // Cleanup before and after each test to ensure isolation
  const cleanup = () => {
    db.prepare("DELETE FROM ai_memories WHERE role_name = ?").run(TEST_ROLE);
    db.prepare("DELETE FROM ai_short_term_memories WHERE role_name = ?").run(TEST_ROLE);
  };

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Long-term Memory", () => {
    it("should add and query long-term memory", () => {
      const content = "这是一条长时记忆测试内容";

      // Add
      db.prepare(/* sql */ "INSERT INTO ai_memories (role_name, content) VALUES (?, ?)").run(
        TEST_ROLE,
        content,
      );

      // Query
      const rows = db
        .prepare<unknown[], { content: string }>(
          /* sql */ "SELECT content FROM ai_memories WHERE role_name = ? ORDER BY created_at DESC",
        )
        .all(TEST_ROLE);

      expect(rows).toHaveLength(1);
      expect(rows[0].content).toBe(content);
    });

    it("should delete long-term memory", () => {
      const content = "待删除的长时记忆";
      const info = db
        .prepare(/* sql */ "INSERT INTO ai_memories (role_name, content) VALUES (?, ?)")
        .run(TEST_ROLE, content);

      const id = info.lastInsertRowid;

      db.prepare(/* sql */ "DELETE FROM ai_memories WHERE id = ?").run(id);

      const rows = db
        .prepare<unknown[], { content: string }>(
          /* sql */ "SELECT content FROM ai_memories WHERE id = ?",
        )
        .all(id);

      expect(rows).toHaveLength(0);
    });
  });

  describe("Short-term Memory", () => {
    it("should add and query short-term memory with limit", () => {
      // Add 25 memories
      const insert = db.prepare(
        /* sql */ "INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)",
      );

      for (let i = 1; i <= 25; i++) {
        insert.run(TEST_ROLE, `短期记忆 ${i}`, Date.now() + i);
      }

      // Query (should be limited to 20)
      const rows = db
        .prepare<unknown[], { content: string }>(
          /* sql */ "SELECT content FROM ai_short_term_memories WHERE role_name = ? ORDER BY created_at DESC LIMIT 20",
        )
        .all(TEST_ROLE);

      expect(rows).toHaveLength(20);
      expect(rows[0].content).toBe("短期记忆 25"); // Latest first
    });

    it("should filter short-term memory by date range", () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      // const yesterdayStr = yesterday.toISOString().split("T")[0];

      const insert = db.prepare(
        /* sql */ "INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)",
      );

      // Yesterday's memory
      insert.run(TEST_ROLE, "昨天的记忆", yesterday.getTime());
      // Today's memory
      insert.run(TEST_ROLE, "今天的记忆", now.getTime());

      // Query today only
      const startTimestamp = new Date(today).getTime();
      const endTimestamp = new Date(`${today} 23:59:59`).getTime();

      const rows = db
        .prepare<unknown[], { content: string }>(
          /* sql */ "SELECT content FROM ai_short_term_memories WHERE role_name = ? AND created_at >= ? AND created_at <= ?",
        )
        .all(TEST_ROLE, startTimestamp, endTimestamp);

      expect(rows).toHaveLength(1);
      expect(rows[0].content).toBe("今天的记忆");
    });
  });
});
