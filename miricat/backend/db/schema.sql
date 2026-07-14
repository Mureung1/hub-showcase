-- 미리캣 DB 스키마 (Supabase / Postgres) — MIRI-2
-- Supabase SQL Editor에 그대로 붙여 실행. 재실행 안전(idempotent).
-- 설계 근거: 실제 API 응답 docs/samples/{odsay,directions}.json.
-- 모드별로 필드가 다르고(도로명 vs 노선/정류장) 가변 배열이라, 자주 필터하는 것만 컬럼·나머지 배열은 JSONB.

-- ─────────────────────────────────────────────────────────────
-- 1) routes — 사용자 경로 등록 (출발/도착/시간대). 등록 1건 = 1행.
-- ─────────────────────────────────────────────────────────────
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  name text,                              -- 별칭 예: "유성→대덕 출근길"
  created_at timestamptz default now()
);
-- 기존 routes(id·created_at·name)에 컬럼 보강
alter table routes add column if not exists origin_name text;
alter table routes add column if not exists origin_lat  double precision;
alter table routes add column if not exists origin_lng  double precision;
alter table routes add column if not exists dest_name   text;
alter table routes add column if not exists dest_lat    double precision;
alter table routes add column if not exists dest_lng    double precision;
alter table routes add column if not exists depart_time text;   -- 시간대 예: "08:00"

-- ─────────────────────────────────────────────────────────────
-- 2) route_candidates — 경로 후보 (선택 + 안 고른 대안). 등록 1 : N 후보.
--    CLAUDE.md "안 고른 후보도 저장 = 대안용" 요구 반영.
-- ─────────────────────────────────────────────────────────────
create table if not exists route_candidates (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  mode text not null check (mode in ('driving','transit')),
  is_selected boolean not null default false,
  -- 모드별 요약:
  --   driving  {distance, duration, tollFare, fuelPrice}   (Naver summary)
  --   transit  {totalTime, payment, totalWalk, transfers}  (ODsay info)
  summary jsonb,
  roads    jsonb,   -- 자차 경유 도로   [{name, distance}]        (Naver section[].name)
  lines    jsonb,   -- 대중교통 이용 노선 [{type:'bus'|'subway', no}] (ODsay lane[].busNo)
  stations jsonb,   -- 대중교통 경유 정류장 [{name, x, y, arsID}]   (ODsay passStopList.stations)
  path     jsonb,   -- 좌표열 [[lng, lat], ...]                    (Naver path / ODsay lane 좌표)
  created_at timestamptz default now()
);

create index if not exists idx_route_candidates_route on route_candidates(route_id);

-- 한 등록당 '선택된' 후보는 최대 1개 (부분 유니크 인덱스)
create unique index if not exists uniq_selected_per_route
  on route_candidates(route_id) where is_selected;

-- RLS: routes와 동일하게 켜고 정책 없음 = 백엔드(service_role)만 접근, 공개 anon 차단
alter table route_candidates enable row level security;
