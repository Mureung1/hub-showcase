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
// grade_weight 는 학점 반영 비율(0~100%), grading/study_amount 는 1~5 척도다.
db.exec(`
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    understanding INTEGER NOT NULL,
    difficulty INTEGER NOT NULL,
    grade_weight INTEGER NOT NULL DEFAULT 40,
    grading INTEGER NOT NULL DEFAULT 3,
    study_amount INTEGER NOT NULL DEFAULT 3,
    available_time INTEGER NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// 이미 만들어진 DB 파일 마이그레이션. CREATE TABLE 은 기존 파일에 컬럼을 추가하지 않으므로
// 없는 컬럼만 ALTER TABLE 로 채운다.
function tableColumns() {
  return new Set(
    db.prepare("PRAGMA table_info(subjects)").all().map((column) => column.name)
  );
}

let columns = tableColumns();

for (const [name, ddl] of [
  ["grading", "grading INTEGER NOT NULL DEFAULT 3"],
  ["study_amount", "study_amount INTEGER NOT NULL DEFAULT 3"],
  ["available_time", "available_time INTEGER NOT NULL DEFAULT 3"],
]) {
  if (!columns.has(name)) {
    db.exec(`ALTER TABLE subjects ADD COLUMN ${ddl}`);
  }
}

// 중요도(importance, 1~5)를 학점 반영 비율(grade_weight, 0~100%)로 바꾼다.
// grade_weight 가 없으면 만들고, 옛 importance 값이 있으면 점수 기여도를 보존하도록
// (importance-1)*25 로 환산해 채운 뒤(1→0, 3→50, 5→100), 옛 컬럼은 제거한다.
if (!columns.has("grade_weight")) {
  db.exec("ALTER TABLE subjects ADD COLUMN grade_weight INTEGER NOT NULL DEFAULT 40");
  if (columns.has("importance")) {
    db.exec("UPDATE subjects SET grade_weight = MAX(0, MIN(100, (importance - 1) * 25))");
  }
  columns = tableColumns();
}

if (columns.has("importance")) {
  db.exec("ALTER TABLE subjects DROP COLUMN importance");
}

export default db;
