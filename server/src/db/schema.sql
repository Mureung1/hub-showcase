-- 빵지도 DB 스키마 (Postgres / Supabase)
-- CLAUDE.md 6번 결정사항 반영: Supabase(Postgres)로 DB 구성, 인증(bcrypt+JWT)은 자체 Express API가 그대로 담당

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bakeries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  signature_menu TEXT,
  comment TEXT,
  price_range TEXT,
  open_hour DOUBLE PRECISION,
  close_hour DOUBLE PRECISION,
  closed_days TEXT,
  photo_url TEXT,
  busy_hours TEXT
);

-- 자동 추천받기 "커피와 같이 먹고 싶은지" 질문용. 데이터가 없는 곳은 NULL(=모름)로 두고,
-- 필터링 시 NULL/false는 동일하게 취급한다(server/src/services/recommendService.js).
ALTER TABLE bakeries ADD COLUMN IF NOT EXISTS has_coffee BOOLEAN;

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
