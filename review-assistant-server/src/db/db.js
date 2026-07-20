import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../../data')
mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(join(dataDir, 'reviews.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    sentiment TEXT NOT NULL,
    keywords TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON reviews (session_id)
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens (user_id)
`)

// 로그인 계정 ↔ 리뷰 연결 (2026-07-20 추가). 기존 DB 파일과 호환되도록 컬럼이 없을 때만 추가한다.
const reviewsColumns = db.prepare(`PRAGMA table_info(reviews)`).all().map((col) => col.name)
if (!reviewsColumns.includes('user_id')) {
  db.exec(`ALTER TABLE reviews ADD COLUMN user_id INTEGER REFERENCES users(id)`)
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id)
`)
