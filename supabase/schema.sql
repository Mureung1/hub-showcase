-- 이슈 #3: subsidies 테이블 스키마
-- Supabase 대시보드 SQL Editor에 붙여넣어 실행한다.
-- 컬럼은 shared/src/types/subsidy.ts 의 Subsidy 타입과 1:1 매핑하되
-- SQL 예약어(match, where)는 각각 match_score, apply_where 로 회피한다.

create table if not exists public.subsidies (
  id             text primary key,
  name           text        not null,
  org            text        not null,
  amount         text        not null,
  dday           integer     not null,
  match_score    integer     not null,          -- Subsidy.match (예약어 회피)
  deadline       text        not null,          -- 기존 '2026. 7. 11' 포맷 유지
  method         text        not null,
  qualifications text[]      not null default '{}',
  documents      text[]      not null default '{}',
  how            text        not null,
  apply_where    text        not null,          -- Subsidy.where (예약어 회피)
  where_url      text,
  contact        text        not null,
  created_at     timestamptz not null default now()
);

-- 서버는 service_role 키로 접근하므로 RLS를 켜두되 anon 정책은 두지 않는다.
alter table public.subsidies enable row level security;

-- 이슈 #7: 사용자가 제출한 매칭 조건(OnboardingProfile) 저장
-- 컬럼은 server/src/routes/match.ts 의 profileSchema 와 1:1 매핑한다.
create table if not exists public.match_requests (
  id              uuid        primary key default gen_random_uuid(),
  industry        text        not null,
  region          text        not null,
  district        text        not null,
  employees       text        not null,
  revenue         text        not null,
  credit_score    text,
  business_years  text,
  sort            text,
  created_at      timestamptz not null default now()
);

-- 서버는 service_role 키로 접근하므로 RLS를 켜두되 anon 정책은 두지 않는다.
alter table public.match_requests enable row level security;
