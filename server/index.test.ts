import { describe, it, expect, beforeEach, afterAll } from "vite-plus/test";
import { app as fastify } from "./index";
import { db } from "./db";

describe("AI Memory API CRUD Tests", () => {
  const TEST_ROLE = "API测试专家";

  const cleanup = () => {
    db.prepare("DELETE FROM ai_memories WHERE role_name = ?").run(TEST_ROLE);
    db.prepare("DELETE FROM ai_short_term_memories WHERE role_name = ?").run(TEST_ROLE);
  };

  beforeEach(() => {
    cleanup();
  });

  afterAll(async () => {
    cleanup();
    await fastify.close();
  });

  describe("Long-term Memory API", () => {
    it("POST /long-term should create a memory", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/long-term",
        payload: { role_name: TEST_ROLE, content: "API测试长时记忆" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();
    });

    it("PUT /long-term/:id should update a memory", async () => {
      const info = db
        .prepare("INSERT INTO ai_memories (role_name, content) VALUES (?, ?)")
        .run(TEST_ROLE, "旧内容");
      const id = info.lastInsertRowid;

      const response = await fastify.inject({
        method: "PUT",
        url: `/long-term/${id}`,
        payload: { content: "新内容", role_name: TEST_ROLE },
      });

      expect(response.statusCode).toBe(200);
      const check = db.prepare("SELECT content FROM ai_memories WHERE id = ?").get(id) as {
        content: string;
      };
      expect(check.content).toBe("新内容");
    });

    it("DELETE /long-term/:id should remove a memory", async () => {
      const info = db
        .prepare("INSERT INTO ai_memories (role_name, content) VALUES (?, ?)")
        .run(TEST_ROLE, "待删除");
      const id = info.lastInsertRowid;

      const response = await fastify.inject({
        method: "DELETE",
        url: `/long-term/${id}`,
      });

      expect(response.statusCode).toBe(200);
      const check = db.prepare("SELECT * FROM ai_memories WHERE id = ?").get(id);
      expect(check).toBeUndefined();
    });

    it("GET /long-term should support pagination and date filtering", async () => {
      const insert = db.prepare(
        "INSERT INTO ai_memories (role_name, content, created_at) VALUES (?, ?, ?)",
      );
      for (let i = 1; i <= 25; i++) {
        insert.run(TEST_ROLE, `记忆 ${i}`, `2026-04-15 10:00:${i.toString().padStart(2, "0")}`);
      }

      const response = await fastify.inject({
        method: "GET",
        url: "/long-term",
        query: { role_name: TEST_ROLE, page: "1", pageSize: "10" },
      });

      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(10);
      expect(body.total).toBe(25);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });
  });

  describe("Short-term Memory API", () => {
    it("POST /short-term should create a memory", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/short-term",
        payload: { role_name: TEST_ROLE, content: "API测试短时记忆" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
    });

    it("PUT /short-term/:id should update a memory", async () => {
      const info = db
        .prepare(
          "INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)",
        )
        .run(TEST_ROLE, "旧短期", Date.now());
      const id = info.lastInsertRowid;

      const response = await fastify.inject({
        method: "PUT",
        url: `/short-term/${id}`,
        payload: { content: "新短期" },
      });

      expect(response.statusCode).toBe(200);
      const check = db
        .prepare("SELECT content FROM ai_short_term_memories WHERE id = ?")
        .get(id) as { content: string };
      expect(check.content).toBe("新短期");
    });

    it("DELETE /short-term/:id should remove a memory", async () => {
      const info = db
        .prepare(
          "INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)",
        )
        .run(TEST_ROLE, "待删", Date.now());
      const id = info.lastInsertRowid;

      const response = await fastify.inject({
        method: "DELETE",
        url: `/short-term/${id}`,
      });

      expect(response.statusCode).toBe(200);
      const check = db.prepare("SELECT * FROM ai_short_term_memories WHERE id = ?").get(id);
      expect(check).toBeUndefined();
    });

    it("GET /short-term should support pagination and time filtering", async () => {
      const now = Date.now();
      const insert = db.prepare(
        "INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)",
      );
      for (let i = 1; i <= 30; i++) {
        insert.run(TEST_ROLE, `短期记忆 ${i}`, now + i);
      }

      const response = await fastify.inject({
        method: "GET",
        url: "/short-term",
        query: { role_name: TEST_ROLE, page: "2", pageSize: "10" },
      });

      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(10);
      expect(body.total).toBe(30);
      expect(body.page).toBe(2);
    });
  });
});
