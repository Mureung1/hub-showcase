-- 003_postgis.sql — 위치 조회를 PostGIS로 전환 (docs/최적화.md §4)
--
-- 기존은 Haversine 식을 SQL에 직접 써서 계산 결과로 필터했다.
-- 계산식에는 B-tree 인덱스가 개입할 수 없어 idx_stores_lat_lng가 놀고 있었다.
--
-- PostGIS로 바꾸는 이유는 속도만이 아니다.
--   - 경도 1도의 거리는 위도에 따라 달라진다. bbox로 직접 좁히려면 cos(위도) 보정이
--     필요한데, 빠뜨리면 에러 없이 조용히 대상을 놓친다. ST_DWithin은 그 실수가 불가능하다.
--   - Haversine은 구체 근사(최대 0.5% 오차), geography는 WGS84 회전타원체 기준이다.
--   - 날짜변경선·극지 처리가 공짜다.

CREATE EXTENSION IF NOT EXISTS postgis;

-- lat/lng에서 파생되는 생성 컬럼. 원본을 고치면 자동으로 따라가므로 이중 관리가 없다.
-- 좌표가 없는 행(가게 없는 사장 등)은 NULL이 되고 GiST가 알아서 제외한다.
ALTER TABLE stores
  ADD COLUMN geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;

ALTER TABLE users
  ADD COLUMN geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(base_lng, base_lat), 4326)::geography) STORED;

CREATE INDEX idx_stores_geog ON stores USING GIST (geog);

-- 알림 대상 판정(팬아웃)이 쓰는 인덱스. users 쪽에는 좌표 인덱스가 아예 없었다.
CREATE INDEX idx_users_geog ON users USING GIST (geog);

-- 계산 컬럼으로 필터했기 때문에 원래부터 쓰이지 못했다(EXPLAIN에서 Seq Scan 확인).
-- 쓰이지 않는 인덱스는 쓰기 비용만 늘리므로 정리한다.
DROP INDEX IF EXISTS idx_stores_lat_lng;
