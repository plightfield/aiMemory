import Database from "better-sqlite3";
import { join } from "node:path";

const dbPath = join(process.cwd(), "data", "database.db");
export const db = new Database(dbPath);
