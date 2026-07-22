-- BrandProfile: 단일 브랜드 가정(../../docs/api-spec.md, PROJECT.md 2-1 참고) — 여러 행이
-- 쌓여도 서버는 가장 최근 1건만 현재 프로필로 취급한다.
CREATE TABLE IF NOT EXISTS brand_profiles (
  id TEXT PRIMARY KEY,
  business_type TEXT NOT NULL,
  store_name TEXT NOT NULL,
  main_product TEXT NOT NULL,
  target_customer TEXT NOT NULL,
  brand_mood TEXT NOT NULL,
  strength TEXT NOT NULL,
  tone TEXT NOT NULL,
  goal TEXT NOT NULL,
  summary TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_created_at ON brand_profiles (created_at DESC);
