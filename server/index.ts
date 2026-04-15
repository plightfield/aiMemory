import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { db } from "./db";
import { migrate } from "./migrate";

// 启动时自动执行迁移
migrate();

const fastify = Fastify({
  logger: false,
}).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

await fastify.register(cors, {
  origin: "*", // 显式使用通配符
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"], // 显式列出常用 Header
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

/**
 * Zod Schemas
 */
const MemorySchema = z.object({
  role_name: z.string(),
  content: z.string(),
});

const QuerySchema = z.object({
  role_name: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(20),
});

const IdParamSchema = z.object({
  id: z.coerce.number(),
});

const UpdateMemorySchema = z.object({
  role_name: z.string().optional(),
  content: z.string().optional(),
});

/**
 * 长时记忆 CRUD
 */
fastify.get("/long-term", { schema: { querystring: QuerySchema } }, async (request) => {
  const { role_name, start_date, end_date, page, pageSize } = request.query;

  let sql = /* sql */ `SELECT * FROM ai_memories WHERE 1=1`;
  const params: any[] = [];

  if (role_name) {
    sql += /* sql */ ` AND role_name = ?`;
    params.push(role_name);
  }
  if (start_date) {
    sql += /* sql */ ` AND created_at >= ?`;
    params.push(start_date);
  }
  if (end_date) {
    sql += /* sql */ ` AND created_at <= ?`;
    params.push(`${end_date} 23:59:59`);
  }

  sql += /* sql */ ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const rows = db.prepare(sql).all(...params);

  let countSql = /* sql */ `SELECT COUNT(*) as total FROM ai_memories WHERE 1=1`;
  const countParams: any[] = [];
  if (role_name) {
    countSql += /* sql */ ` AND role_name = ?`;
    countParams.push(role_name);
  }
  if (start_date) {
    countSql += /* sql */ ` AND created_at >= ?`;
    countParams.push(start_date);
  }
  if (end_date) {
    countSql += /* sql */ ` AND created_at <= ?`;
    countParams.push(`${end_date} 23:59:59`);
  }
  const { total } = db.prepare(countSql).get(...countParams) as { total: number };

  return { data: rows, total, page, pageSize };
});

fastify.post("/long-term", { schema: { body: MemorySchema } }, async (request) => {
  const { role_name, content } = request.body;
  const info = db
    .prepare(/* sql */ `INSERT INTO ai_memories (role_name, content) VALUES (?, ?)`)
    .run(role_name, content);
  return { id: info.lastInsertRowid, success: true };
});

fastify.put(
  "/long-term/:id",
  { schema: { params: IdParamSchema, body: UpdateMemorySchema } },
  async (request) => {
    const { id } = request.params;
    const { content, role_name } = request.body;

    if (content && role_name) {
      db.prepare(/* sql */ `UPDATE ai_memories SET content = ?, role_name = ? WHERE id = ?`).run(
        content,
        role_name,
        id,
      );
    } else if (content) {
      db.prepare(/* sql */ `UPDATE ai_memories SET content = ? WHERE id = ?`).run(content, id);
    } else if (role_name) {
      db.prepare(/* sql */ `UPDATE ai_memories SET role_name = ? WHERE id = ?`).run(role_name, id);
    }

    return { success: true };
  },
);

fastify.delete("/long-term/:id", { schema: { params: IdParamSchema } }, async (request) => {
  const { id } = request.params;
  db.prepare(/* sql */ `DELETE FROM ai_memories WHERE id = ?`).run(id);
  return { success: true };
});

/**
 * 短时记忆 CRUD
 */
fastify.get("/short-term", { schema: { querystring: QuerySchema } }, async (request) => {
  const { role_name, start_date, end_date, page, pageSize } = request.query;

  let sql = /* sql */ `SELECT * FROM ai_short_term_memories WHERE 1=1`;
  const params: any[] = [];

  if (role_name) {
    sql += /* sql */ ` AND role_name = ?`;
    params.push(role_name);
  }
  if (start_date) {
    sql += /* sql */ ` AND created_at >= ?`;
    params.push(new Date(start_date).getTime());
  }
  if (end_date) {
    sql += /* sql */ ` AND created_at <= ?`;
    params.push(new Date(`${end_date} 23:59:59`).getTime());
  }

  sql += /* sql */ ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(pageSize, (page - 1) * pageSize);

  const rows = db.prepare(sql).all(...params);

  let countSql = /* sql */ `SELECT COUNT(*) as total FROM ai_short_term_memories WHERE 1=1`;
  const countParams: any[] = [];
  if (role_name) {
    countSql += /* sql */ ` AND role_name = ?`;
    countParams.push(role_name);
  }
  if (start_date) {
    countSql += /* sql */ ` AND created_at >= ?`;
    countParams.push(new Date(start_date).getTime());
  }
  if (end_date) {
    countSql += /* sql */ ` AND created_at <= ?`;
    countParams.push(new Date(`${end_date} 23:59:59`).getTime());
  }
  const { total } = db.prepare(countSql).get(...countParams) as { total: number };

  return { data: rows, total, page, pageSize };
});

fastify.post("/short-term", { schema: { body: MemorySchema } }, async (request) => {
  const { role_name, content } = request.body;
  const timestamp = Date.now();
  const info = db
    .prepare(
      /* sql */ `INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)`,
    )
    .run(role_name, content, timestamp);
  return { id: info.lastInsertRowid, success: true };
});

fastify.put(
  "/short-term/:id",
  { schema: { params: IdParamSchema, body: UpdateMemorySchema } },
  async (request) => {
    const { id } = request.params;
    const { content, role_name } = request.body;

    if (content && role_name) {
      db.prepare(
        /* sql */ `UPDATE ai_short_term_memories SET content = ?, role_name = ? WHERE id = ?`,
      ).run(content, role_name, id);
    } else if (content) {
      db.prepare(/* sql */ `UPDATE ai_short_term_memories SET content = ? WHERE id = ?`).run(
        content,
        id,
      );
    } else if (role_name) {
      db.prepare(/* sql */ `UPDATE ai_short_term_memories SET role_name = ? WHERE id = ?`).run(
        role_name,
        id,
      );
    }

    return { success: true };
  },
);

fastify.delete("/short-term/:id", { schema: { params: IdParamSchema } }, async (request) => {
  const { id } = request.params;
  db.prepare(/* sql */ `DELETE FROM ai_short_term_memories WHERE id = ?`).run(id);
  return { success: true };
});

/**
 * 记忆转换接口 (一键长短时互转)
 */
fastify.post(
  "/convert/:id",
  {
    schema: {
      params: IdParamSchema,
      querystring: z.object({ from: z.enum(["long-term", "short-term"]) }),
    },
  },
  async (request) => {
    const { id } = request.params;
    const { from } = request.query;

    const sourceTable = from === "long-term" ? "ai_memories" : "ai_short_term_memories";

    // 1. 获取原始数据
    const item = db.prepare(`SELECT role_name, content FROM ${sourceTable} WHERE id = ?`).get(id) as
      | { role_name: string; content: string }
      | undefined;

    if (!item) {
      throw new Error("Memory not found");
    }

    // 2. 插入到目标表
    if (from === "long-term") {
      // 长转短：从源表获取原始 created_at 并尝试转为时间戳，如果失败则用当前时间
      const original = db.prepare(`SELECT created_at FROM ai_memories WHERE id = ?`).get(id) as {
        created_at: string;
      };
      let timestamp = Date.now();
      if (original && original.created_at) {
        // 将 "YYYY-MM-DD HH:MM:SS" 转换为 "YYYY-MM-DDTHH:MM:SS" 以便更好解析
        const timeStr = original.created_at.replace(" ", "T");
        const parsed = new Date(timeStr).getTime();
        if (!isNaN(parsed)) {
          timestamp = parsed;
        }
      }

      db.prepare(
        /* sql */ `INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)`,
      ).run(item.role_name, item.content, timestamp);
    } else {
      // 短转长：从源表获取原始时间戳并转为本地日期字符串
      const original = db
        .prepare(`SELECT created_at FROM ai_short_term_memories WHERE id = ?`)
        .get(id) as { created_at: number };
      const offset = new Date().getTimezoneOffset() * 60000;
      const dateStr =
        original && original.created_at
          ? new Date(original.created_at - offset).toISOString().replace("T", " ").split(".")[0]
          : new Date(Date.now() - offset).toISOString().replace("T", " ").split(".")[0];

      db.prepare(
        /* sql */ `INSERT INTO ai_memories (role_name, content, created_at) VALUES (?, ?, ?)`,
      ).run(item.role_name, item.content, dateStr);
    }

    // 3. 从原始表删除
    db.prepare(`DELETE FROM ${sourceTable} WHERE id = ?`).run(id);

    return { success: true };
  },
);

fastify.get("/ping", async () => {
  return { status: "ok", message: "pong", timestamp: new Date().toISOString() };
});

export const app = fastify;

const start = async () => {
  try {
    const address = await fastify.listen({ port: 4331, host: "0.0.0.0" });
    console.log(`Server listening on ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  // oxlint-disable-next-line typescript/no-floating-promises
  start();
}
