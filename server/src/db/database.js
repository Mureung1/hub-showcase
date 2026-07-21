import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 이 파일 기준 경로. server/data/app.db 에 SQLite 파일을 둔다.
const currentDir = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(currentDir, "..", "..", "data");
const DB_PATH = process.env.DB_PATH || join(DB_DIR, "app.db");

// data 디렉터리가 없으면 만든다. (파일 DB라 서버를 재시작해도 데이터가 남는다.)
mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

// docs/data-model.md 의 subjects 테이블을 SQLite로 옮긴 것.
// id 는 서버가 자동 발급(AUTOINCREMENT), created_at 은 저장 시각을 기본값으로 채운다.
db.exec(`
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    understanding INTEGER NOT NULL,
    difficulty INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// 나중에 추가된 컬럼들. 이미 만들어진 DB 파일에는 CREATE TABLE 로 컬럼이 생기지 않으므로,
// 없는 컬럼만 골라 ALTER TABLE 로 채운다. (기존 행은 DEFAULT 3 으로 채워진다.)
const ADDED_COLUMNS = [
  { name: "importance", ddl: "importance INTEGER NOT NULL DEFAULT 3" },
  { name: "grading", ddl: "grading INTEGER NOT NULL DEFAULT 3" },
  { name: "study_amount", ddl: "study_amount INTEGER NOT NULL DEFAULT 3" },
];

const existingColumns = new Set(
  db.prepare("PRAGMA table_info(subjects)").all().map((column) => column.name)
);

for (const column of ADDED_COLUMNS) {
  if (!existingColumns.has(column.name)) {
    db.exec(`ALTER TABLE subjects ADD COLUMN ${column.ddl}`);
  }
}

export default db;
