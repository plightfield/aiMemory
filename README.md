# AI Memory Manager 🐷

一个基于 Model Context Protocol (MCP) 的全栈 AI 记忆管理系统。

### 🤖 核心逻辑

- **MCP 服务 (AI 专用)**：作为 AI 代理（如 Cursor Agent）的“大脑接口”，提供标准化的工具集，允许 AI 自动持久化决策、推导过程和架构规范。
- **Web 后台 (人类专用)**：作为开发者的“监控面板”，提供可视化界面用于手动审查、微调、修正或删除 AI 存入的记忆，确保记忆库的准确性与纯净度。

## 🌟 核心特性

- **双层记忆架构**：
  - **长时记忆 (Long-term)**：持久化存储核心决策、架构规范和关键里程碑。
  - **短时记忆 (Short-term)**：记录开发过程中的临时上下文、逻辑推导和即时需求，支持自动过期逻辑（前端展示最近 20 条）。
- **MCP 原生支持**：内置 MCP Server，AI 代理可以直接通过 `add_long_term_memory` 等工具进行读写。
- **现代化管理后台**：
  - 基于 **React 19** + **Ant Design 6.x** 构建。
  - 支持按角色（Role）筛选、日期范围搜索。
  - 提供复制角色名、编辑内容、删除记录等便捷操作。
  - 全界面中文化支持。
- **坚固的后端底座**：
  - 使用 **Fastify 5.x** 提供高性能 RESTful API。
  - **SQLite (better-sqlite3)** 存储，无需复杂配置，开箱即用。
  - 严格的 **Zod** 类型校验，确保数据一致性。
- **全自动化工具链**：
  - 使用 **Vite+ (vp)** 统一管理开发、构建和测试。
  - 内置端口清理和并行服务启动脚本。

## 🚀 快速开始

### 1. 环境准备

确保你的 Node.js 版本为 `22.22.1`（已在 `package.json` 中强制约束）。

```bash
# 安装依赖
vp install
```

### 2. 启动服务

一键启动后端 API 服务和前端预览：

```bash
pnpm serve
```

- **后端 API**: `http://localhost:4331`
- **前端预览**: `http://localhost:4332`
- **前端开发**: `http://localhost:4333` (使用 `vp dev`)

### 3. 配置 MCP (Cursor)

将以下配置添加到你的 `mcp.json` 中，让 AI 代理能够访问记忆库：

```json
{
  "mcpServers": {
    "aiMemory": {
      "command": "npm",
      "args": [
        "--prefix",
        // 切换为项目所在路径
        "D:\\workbench\\aiMemory",
        "run",
        "mcp"
      ],
      "alwaysAllow": [
        "add_long_term_memory",
        "query_long_term_memories",
        "delete_long_term_memory",
        "add_short_term_memory",
        "query_short_term_memories",
        "delete_short_term_memory"
      ]
    }
  }
}
```

## 🛠 技术栈

- **前端**: React 19, Ant Design 6.x, Day.js, Vite+
- **后端**: Fastify 5.x, better-sqlite3, Zod
- **协议**: Model Context Protocol (MCP) SDK
- **测试**: Vitest, Happy-dom, @testing-library/react
- **工具**: tsx, concurrently, kill-port

## 📂 目录结构

```text
├── server/             # 后端逻辑
│   ├── db.ts           # 数据库初始化
│   ├── migrate.ts      # 数据库迁移脚本
│   ├── index.ts        # Fastify REST API
│   └── mcp.ts          # MCP Server 实现
├── src/                # 前端代码
│   ├── app/            # 页面组件与 Hooks
│   └── main.tsx        # 入口配置 (ConfigProvider, Locale)
├── data/               # SQLite 数据库文件存储
└── package.json        # 脚本与依赖管理
```

## 🧪 测试

系统内置了完备的单元测试和集成测试：

```bash
# 运行所有测试
vp test

# 运行前端测试
vp test src/app

# 运行后端测试
vp test server
```

## 🐷 开发者备注

- 所有的业务逻辑均已实现“离体”，组件仅负责视图渲染。
- 采用 TDD 闭环开发，任何逻辑变更均有测试支撑。
- 严格遵循 Ant Design 6.x 规范，杜绝过时属性。

---

_Made with ❤️ by Cyber Pig 🐷_
