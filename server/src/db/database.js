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
// grade_weight 는 성적 반영 비율(0~100%), grading/study_amount/available_time/understanding/difficulty 는 1~7 척도다.
// grade_weight 는 NULL 을 허용한다. NULL 은 "모름"이고 0 은 "성적에 안 들어감"이라 뜻이 다르다.
db.exec(`
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    understanding INTEGER NOT NULL,
    difficulty INTEGER NOT NULL,
    grade_weight INTEGER,
    grading INTEGER NOT NULL DEFAULT 4,
    study_amount INTEGER NOT NULL DEFAULT 4,
    available_time INTEGER NOT NULL DEFAULT 4,
    credits REAL,
    previous_score INTEGER,
    completed_at TEXT,
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
  ["grading", "grading INTEGER NOT NULL DEFAULT 4"],
  ["study_amount", "study_amount INTEGER NOT NULL DEFAULT 4"],
  ["available_time", "available_time INTEGER NOT NULL DEFAULT 4"],
  ["credits", "credits REAL"],
  // 이전 시험 점수는 선택 입력이라 기본값 없이 NULL 을 허용한다("해당 없음"과 구분).
  ["previous_score", "previous_score INTEGER"],
  // 완료 처리 시각. NULL 이면 활성, 값이 있으면 완료(과목 완료 체크·히스토리 기능).
  ["completed_at", "completed_at TEXT"],
]) {
  if (!columns.has(name)) {
    db.exec(`ALTER TABLE subjects ADD COLUMN ${ddl}`);
  }
}

// 중요도(importance, 1~5)를 학점 반영 비율(grade_weight, 0~100%)로 바꾼다.
// grade_weight 가 없으면 만들고, 옛 importance 값이 있으면 점수 기여도를 보존하도록
// (importance-1)*25 로 환산해 채운 뒤(1→0, 3→50, 5→100), 옛 컬럼은 제거한다.
if (!columns.has("grade_weight")) {
  db.exec("ALTER TABLE subjects ADD COLUMN grade_weight INTEGER");
  if (columns.has("importance")) {
    db.exec("UPDATE subjects SET grade_weight = MAX(0, MIN(100, (importance - 1) * 25))");
  }
  columns = tableColumns();
}

if (columns.has("importance")) {
  db.exec("ALTER TABLE subjects DROP COLUMN importance");
}

// 이해도·난이도·교수 성향·분량·시간을 1~5 척도에서 1~7 척도로 바꾼다.
// 기존 값을 그대로 두면 "3"(예전 중간)이 1~7에서는 뜻이 살짝 바뀌어버리므로,
// 선형 비례식 1 + (old-1) * 6/4 로 환산해 상대적 위치를 보존한다. (1→1, 3→4, 5→7)
// PRAGMA user_version 으로 이 마이그레이션을 한 번만 실행한다.
const SCALE_MIGRATION_VERSION = 1;

function currentVersion() {
  return db.prepare("PRAGMA user_version").get().user_version;
}

if (currentVersion() < SCALE_MIGRATION_VERSION) {
  for (const column of ["understanding", "difficulty", "grading", "study_amount", "available_time"]) {
    db.exec(`
      UPDATE subjects
      SET ${column} = CAST(ROUND(1 + (${column} - 1) * 6.0 / 4.0) AS INTEGER)
      WHERE ${column} BETWEEN 1 AND 5
    `);
  }
  db.exec(`PRAGMA user_version = ${SCALE_MIGRATION_VERSION}`);
}

// grade_weight 를 NOT NULL DEFAULT 40 에서 NULL 허용으로 바꾼다.
// 사용자가 성적 반영 비율을 답하지 않았는데 40% 라고 답한 것으로 집계하면,
// 계산기가 막으려던 "모르겠다가 몰래 한 표를 행사하는" 상황이 그대로 생긴다.
// SQLite 는 컬럼 제약을 ALTER 로 못 바꾸므로 테이블을 다시 만들어 옮긴다.
const GRADE_WEIGHT_NULLABLE_VERSION = 2;

if (currentVersion() < GRADE_WEIGHT_NULLABLE_VERSION) {
  db.exec(`
    BEGIN;
    CREATE TABLE subjects_migrated (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      understanding INTEGER NOT NULL,
      difficulty INTEGER NOT NULL,
      grade_weight INTEGER,
      grading INTEGER NOT NULL DEFAULT 4,
      study_amount INTEGER NOT NULL DEFAULT 4,
      available_time INTEGER NOT NULL DEFAULT 4,
      credits REAL NOT NULL DEFAULT 3,
      previous_score INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO subjects_migrated
      (id, name, exam_date, understanding, difficulty, grade_weight, grading,
       study_amount, available_time, credits, previous_score, completed_at, created_at)
    SELECT
      id, name, exam_date, understanding, difficulty, grade_weight, grading,
      study_amount, available_time, credits, previous_score, completed_at, created_at
    FROM subjects;
    DROP TABLE subjects;
    ALTER TABLE subjects_migrated RENAME TO subjects;
    PRAGMA user_version = ${GRADE_WEIGHT_NULLABLE_VERSION};
    COMMIT;
  `);
}

// credits 도 NULL 을 허용한다.
// 학점이 점수를 곱하는 배수였을 때는 3(=1배)이 진짜 중립이라 기본값으로 채워도 괜찮았다.
// 이제는 학점도 가중 평균에 들어가는 요인이라, 안 답한 값을 3으로 채우면
// 사용자가 하지 않은 대답이 점수에 섞인다.
const CREDITS_NULLABLE_VERSION = 3;

if (currentVersion() < CREDITS_NULLABLE_VERSION) {
  db.exec(`
    BEGIN;
    CREATE TABLE subjects_migrated (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      understanding INTEGER NOT NULL,
      difficulty INTEGER NOT NULL,
      grade_weight INTEGER,
      grading INTEGER NOT NULL DEFAULT 4,
      study_amount INTEGER NOT NULL DEFAULT 4,
      available_time INTEGER NOT NULL DEFAULT 4,
      credits REAL,
      previous_score INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO subjects_migrated
      (id, name, exam_date, understanding, difficulty, grade_weight, grading,
       study_amount, available_time, credits, previous_score, completed_at, created_at)
    SELECT
      id, name, exam_date, understanding, difficulty, grade_weight, grading,
      study_amount, available_time, credits, previous_score, completed_at, created_at
    FROM subjects;
    DROP TABLE subjects;
    ALTER TABLE subjects_migrated RENAME TO subjects;
    PRAGMA user_version = ${CREDITS_NULLABLE_VERSION};
    COMMIT;
  `);
}

export default db;
