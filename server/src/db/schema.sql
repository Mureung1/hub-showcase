-- 빵지도 DB 스키마 (SQLite / better-sqlite3)
-- CLAUDE.md 6번 결정사항 반영: SQLite로 시작, 모델 레이어 분리로 추후 Postgres 전환 대비

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bakeries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL,
  signature_menu TEXT,
  comment TEXT,
  price_range TEXT,
  open_hour REAL,
  close_hour REAL,
  closed_days TEXT,
  photo_url TEXT,
  busy_hours TEXT
);

-- 회원가입 시 고르는 빵 취향 (다대다)
CREATE TABLE IF NOT EXISTS user_tastes (
  user_id INTEGER NOT NULL REFERENCES users(id),
  taste TEXT NOT NULL,
  PRIMARY KEY (user_id, taste)
);

-- 가본 곳 / 가고 싶은 곳
CREATE TABLE IF NOT EXISTS user_bakery_status (
  user_id INTEGER NOT NULL REFERENCES users(id),
  bakery_id INTEGER NOT NULL REFERENCES bakeries(id),
  status TEXT NOT NULL CHECK (status IN ('visited', 'wishlist')),
  PRIMARY KEY (user_id, bakery_id, status)
);
