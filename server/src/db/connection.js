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
