import Database from 'better-sqlite3'

export const db = new Database('career.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS interests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company    TEXT NOT NULL,
    role       TEXT NOT NULL,
    jd         TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)