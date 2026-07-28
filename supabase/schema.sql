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
  region         text[]      not null default '{}', -- 이슈 #43: hashtags 기반 시/도 배열.
                                                      -- 전국 대상 공고는 전체 시/도가 다 담기므로
                                                      -- match()에서 profile.region이 배열에
                                                      -- 포함되는지만 확인하면 전국/광역권/단일
                                                      -- 지역이 같은 방식으로 매칭된다. 빈 배열은
                                                      -- "지역 정보 없음"(hashtags 미제공 등).
  industry       text[]      not null default '{}', -- 이슈 #52: bsnsSumryCn/trgetNm 키워드 기반
                                                      -- 업종 배열. region과 동일하게 매칭되면
                                                      -- 가점, 빈 배열은 "업종 정보 없음"(대다수).
  created_at     timestamptz not null default now()
);

-- 서버는 service_role 키로 접근하므로 RLS를 켜두되 anon 정책은 두지 않는다.
alter table public.subsidies enable row level security;

-- 이슈 #43: 이미 배포된 테이블은 위 create table이 스킵되므로 별도로 컬럼을 추가한다.
alter table public.subsidies add column if not exists region text[] not null default '{}';

-- 이슈 #52: 이미 배포된 테이블은 위 create table이 스킵되므로 별도로 컬럼을 추가한다.
alter table public.subsidies add column if not exists industry text[] not null default '{}';

-- 이슈 #67: 첨부파일 AI 구조화 추출 결과. employees/revenue/business_years는 문서 원문 표현,
-- *_max_count/*_max_krw/*_years_max는 매칭 가점 계산용 정규화 숫자. 전부 nullable —
-- 신규 공고 중 AI 추출을 아직 안 했거나 문서에 조건이 없으면 null("정보 없음").
alter table public.subsidies add column if not exists employees text;
alter table public.subsidies add column if not exists employees_max_count integer;
alter table public.subsidies add column if not exists revenue text;
alter table public.subsidies add column if not exists revenue_max_krw bigint;
alter table public.subsidies add column if not exists business_years text;
alter table public.subsidies add column if not exists business_years_max numeric;

-- 이슈 #77: document_extractions와 조인해 "AI 보강 여부/사용 모델"을 확인할 수 있게
-- 첨부파일 식별자를 subsidies에도 저장(nullable — 첨부파일 없는 공고도 있음).
alter table public.subsidies add column if not exists atch_file_id text;

-- 이슈 #90: 지원분야 대/중분류(bizinfo pldirSportRealmLclasCodeNm/MlsfcCodeNm). 대분류는
-- 실측 결측 0%라 not null, 중분류는 옵션 필드라 nullable로 둔다.
alter table public.subsidies add column if not exists support_realm text not null default '';
alter table public.subsidies add column if not exists support_realm_detail text;

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

-- 이슈 #91/#92: 온보딩 업종(industry) 질문을 지원분야(supportRealm) 복수선택으로 완전히
-- 교체하며 추가. 기존 industry 컬럼은 이 프로젝트의 기존 관례대로 드롭하지 않고 그대로 둔다
-- (region/industry/employees 등 추가 시에도 컬럼을 삭제한 적 없음 — 사용 안 하는 legacy 컬럼).
alter table public.match_requests add column if not exists support_realm text[] not null default '{}';

-- 이슈 #67: 첨부파일 AI 구조화 추출 결과 캐시 (atchFileId 기준, 재호출 방지 목적)
-- 크롤러(묶음 2)는 이 테이블에만 쓰고, subsidies 반영은 별도 단계(묶음 3)에서 처리한다.
-- extracted 컬럼 형태는 crawler/src/gemini-extract.ts의 ExtractedFields와 1:1 매핑.
create table if not exists public.document_extractions (
  atch_file_id   text        primary key,
  model          text        not null, -- 실제로 처리한 모델명 (gemini-2.5-flash / gemini-3.1-flash-lite)
  extracted      jsonb       not null,
  extracted_at   timestamptz not null default now()
);

-- 서버는 service_role 키로 접근하므로 RLS를 켜두되 anon 정책은 두지 않는다.
alter table public.document_extractions enable row level security;
