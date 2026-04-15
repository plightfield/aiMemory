import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { db } from "./db";
import { migrate } from "./migrate";

// 初始化数据库
migrate();

const server = new McpServer({
  name: "ai-memory-mcp",
  version: "1.0.0",
});

/**
 * 长时记忆工具
 */
server.registerTool(
  "add_long_term_memory",
  {
    title: "Add Long-term Memory",
    description: "Add a new long-term memory for the AI",
    inputSchema: {
      role_name: z.string().describe("The name of the AI role"),
      content: z.string().describe("The content of the memory"),
    },
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async ({ role_name, content }) => {
    db.prepare(/* sql */ "INSERT INTO ai_memories (role_name, content) VALUES (?, ?)").run(
      role_name,
      content,
    );
    return { content: [{ type: "text", text: "Long-term memory added." }] };
  },
);

server.registerTool(
  "query_long_term_memories",
  {
    title: "Query Long-term Memories",
    description: "Query all long-term memories associated with a specific AI role",
    inputSchema: {
      role_name: z
        .string()
        .describe(
          "The name of the AI role. Available roles: 小猪 (主 agent), 小 R (前端专家), 小 G (后端专家), 小 M (Rust + 原生专家), 小 T (测试专家), 小 D (设计+需求专家)",
        ),
    },
    annotations: {
      readOnlyHint: true,
    },
  },
  async ({ role_name }) => {
    const rows = db
      .prepare<unknown[], { content: string }>(
        /* sql */ "SELECT content FROM ai_memories WHERE role_name = ? ORDER BY created_at DESC",
      )
      .all(role_name);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            rows.map((r) => r.content),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "delete_long_term_memory",
  {
    title: "Delete Long-term Memory",
    description: "Delete a specific long-term memory by its ID",
    inputSchema: {
      id: z.number().describe("The unique ID of the memory to delete"),
    },
    annotations: {
      destructiveHint: true,
    },
  },
  async ({ id }) => {
    db.prepare(/* sql */ "DELETE FROM ai_memories WHERE id = ?").run(id);
    return { content: [{ type: "text", text: `Memory ${id} deleted.` }] };
  },
);

/**
 * 短时记忆工具
 */
server.registerTool(
  "add_short_term_memory",
  {
    title: "Add Short-term Memory",
    description: "Add a new short-term memory (automatically generates timestamp)",
    inputSchema: {
      role_name: z.string().describe("The name of the AI role"),
      content: z.string().describe("The content of the memory"),
    },
    annotations: {
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async ({ role_name, content }) => {
    const timestamp = Date.now();
    db.prepare(
      /* sql */ "INSERT INTO ai_short_term_memories (role_name, content, created_at) VALUES (?, ?, ?)",
    ).run(role_name, content, timestamp);
    return { content: [{ type: "text", text: "Short-term memory added." }] };
  },
);

server.registerTool(
  "query_short_term_memories",
  {
    title: "Query Short-term Memories",
    description:
      "Query short-term memories with optional date range filter (YYYY-MM-DD), limited to 20 latest entries",
    inputSchema: {
      role_name: z
        .string()
        .describe(
          "The name of the AI role. Available roles: 小猪 (主 agent), 小 R (前端专家), 小 G (后端专家), 小 M (Rust + 原生专家), 小 T (测试专家), 小 D (设计+需求专家)",
        ),
      start_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Start date in YYYY-MM-DD format"),
      end_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("End date in YYYY-MM-DD format"),
    },
    annotations: {
      readOnlyHint: true,
    },
  },
  async ({ role_name, start_date, end_date }) => {
    let query = /* sql */ "SELECT content FROM ai_short_term_memories WHERE role_name = ?";
    const params: any[] = [role_name];

    if (start_date) {
      query += " AND created_at >= ?";
      params.push(new Date(start_date).getTime());
    }
    if (end_date) {
      query += " AND created_at <= ?";
      params.push(new Date(`${end_date} 23:59:59`).getTime());
    }

    query += " ORDER BY created_at DESC LIMIT 20";
    const rows = db.prepare<unknown[], { content: string }>(query).all(...params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            rows.map((r) => r.content),
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "delete_short_term_memory",
  {
    title: "Delete Short-term Memory",
    description: "Delete a specific short-term memory by its ID",
    inputSchema: {
      id: z.number().describe("The unique ID of the short-term memory to delete"),
    },
    annotations: {
      destructiveHint: true,
    },
  },
  async ({ id }) => {
    db.prepare(/* sql */ "DELETE FROM ai_short_term_memories WHERE id = ?").run(id);
    return { content: [{ type: "text", text: `Short-term memory ${id} deleted.` }] };
  },
);

// 启动服务
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AI Memory MCP server running on stdio");
