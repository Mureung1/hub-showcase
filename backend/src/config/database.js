import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

const databasePath = path.join(
  currentDirectory,
  "../../data/calme.db",
);

const database = new Database(databasePath);

database.pragma("journal_mode = WAL");
database.pragma("foreign_keys = ON");

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notice_id INTEGER,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    deadline TEXT,
    time_start TEXT,
    time_end TEXT,
    location TEXT,
    deliverables TEXT,
    notes TEXT,
    category TEXT DEFAULT '기타',
    is_selected BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notice_id) REFERENCES notices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

try {
  database.exec(`ALTER TABLE events ADD COLUMN category TEXT DEFAULT '기타';`);
} catch (e) {
  // 컬럼이 이미 존재하는 경우 무시
}


export default database;