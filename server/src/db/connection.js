import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = process.env.DB_PATH || './data/specfit.db'

export const db = new Database(path.resolve(dbPath))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS analysis_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    filter_json TEXT,
    spec_json TEXT NOT NULL,
    stats_json TEXT NOT NULL,
    job_list_json TEXT NOT NULL
  )
`)

// jobs 테이블 스키마는 여기서 항상 보장한다 — 실제 시드(CSV 삽입)는 db/seed.js가 담당하지만,
// 자동 시드(index.js의 seedJobsIfEmpty)가 COUNT 쿼리를 하려면 테이블이 먼저 존재해야 한다.
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    job_id INTEGER PRIMARY KEY,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    posted_at TEXT,
    deadline TEXT,
    status TEXT,
    job_category TEXT,
    is_intern INTEGER NOT NULL DEFAULT 0,
    education TEXT,
    career_min_months INTEGER,
    career_max_months INTEGER,
    certificates TEXT,
    major TEXT,
    foreign_lang_test TEXT,
    foreign_lang_score INTEGER,
    computer_skill TEXT
  )
`)
