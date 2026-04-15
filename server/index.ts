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
