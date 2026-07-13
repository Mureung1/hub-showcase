-- 001_init.sql — docs/erd.md 기준 초기 스키마 (T-01)

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('consumer', 'owner')),
  -- 소비자 전용 (owner는 NULL)
  base_address TEXT,
  base_lat DOUBLE PRECISION,
  base_lng DOUBLE PRECISION,
  noti_location_mode VARCHAR(10) NOT NULL DEFAULT 'radius'
    CHECK (noti_location_mode IN ('radius', 'always')),
  noti_radius_km NUMERIC(4, 1) NOT NULL DEFAULT 2.0 CHECK (noti_radius_km > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- users 1 : 0..1 stores — owner_id NOT NULL(주인 정확히 1명) + UNIQUE(1인 1가게, MVP)
-- role='owner' 검증은 서비스 레이어 담당 (docs/erd.md "role 정합성")
CREATE TABLE stores (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL UNIQUE REFERENCES users (id),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_interest_categories (
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, category)
);

CREATE TABLE favorites (
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

CREATE TABLE deals (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores (id),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL,
  original_price INTEGER NOT NULL CHECK (original_price > 0),
  sale_price INTEGER NOT NULL CHECK (sale_price > 0),
  total_qty INTEGER NOT NULL CHECK (total_qty > 0),
  remaining_qty INTEGER NOT NULL,
  pickup_deadline_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold_out', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 핵심 불변식의 DB 방어선: 오버셀은 애플리케이션 버그가 있어도 여기서 거부된다
  CONSTRAINT deals_remaining_qty_range CHECK (remaining_qty >= 0 AND remaining_qty <= total_qty),
  CONSTRAINT deals_sale_below_original CHECK (sale_price < original_price)
);

CREATE TABLE reservations (
  id BIGSERIAL PRIMARY KEY,
  deal_id BIGINT NOT NULL REFERENCES deals (id),
  user_id BIGINT NOT NULL REFERENCES users (id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  pickup_code VARCHAR(8) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'picked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picked_at TIMESTAMPTZ
);

CREATE TABLE device_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  deal_id BIGINT REFERENCES deals (id),
  title VARCHAR(100) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 (docs/erd.md 인덱스 계획)
CREATE INDEX idx_deals_status_deadline ON deals (status, pickup_deadline_at);
CREATE INDEX idx_reservations_deal ON reservations (deal_id);
CREATE INDEX idx_favorites_store ON favorites (store_id);
CREATE INDEX idx_stores_lat_lng ON stores (lat, lng);

-- 픽업코드는 "활성 예약 중"에서만 유일하면 된다 — 만료·완료된 코드는 재사용 가능
CREATE UNIQUE INDEX uq_reservations_active_code ON reservations (pickup_code)
  WHERE status = 'reserved';
