-- docs/design/phase2-design.md §3 기준
-- confirmed_slot_id / confirmed_location_id / status 컬럼은 이미 존재함 (대시보드에서 직접 추가됨)
-- confirmed_at만 추가

alter table letters add column confirmed_at timestamptz;
