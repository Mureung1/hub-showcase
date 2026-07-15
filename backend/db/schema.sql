-- backend/db/schema.sql — Supabase 연구 데이터 테이블 (에이전트 c).
-- 적용: Supabase 대시보드 → SQL Editor 에 붙여넣고 실행. (docs/decisions.md ADR-002)
-- 원칙: 비식별 파생값만 저장. 이름·자유응답·PII 컬럼 없음(docs/evidence-data-roadmap.md §8, ADR-006).
-- 식별은 브라우저가 만든 anon_id(가명) 하나뿐 — 계정·로그인과 연결하지 않는다.

create table if not exists public.research_results (
  id                uuid primary key default gen_random_uuid(),
  anon_id           text not null,                 -- 가명 참가자 ID(브라우저 생성). PII 아님.
  -- assessment
  mbti              text,                           -- 사용자가 직접 입력한 공식 결과 or null
  temperament       text,                           -- 기질코드(SJ/SP/NT/NF) 파생값
  -- decision
  matched_methods   jsonb,                          -- MBTI 힌트 포함 TOP 방법 id[]
  baseline_methods  jsonb,                          -- task/state baseline 방법 id[]
  algorithm_version text,
  -- context (task/state, §8) — 범주값·정수만
  task_type         text,                           -- memorize | understand | practice
  deadline          text,                           -- today | thisWeek | flexible
  available_minutes integer,
  -- outcome (수용지표 · 자기평가)
  fit_score         integer,                        -- 1..5 (추천 적합도)
  understanding     integer,                        -- 1..5
  actionability     integer,                        -- 1..5
  focus             integer,                        -- 1..5
  fatigue           integer,                        -- 1..5
  calibration_error integer,                        -- |예측-실제| 회상 보정오차
  created_at        timestamptz not null default now()
);

-- 이 anon_id 로 조회·삭제(삭제권)가 잦으므로 인덱스.
create index if not exists research_results_anon_id_idx
  on public.research_results (anon_id);

-- RLS: 서버(service_role 키)만 접근한다. anon/public 키로는 접근 불가.
-- 백엔드는 service_role 키로 RLS 를 우회하며, 프론트는 서버를 통해서만 접근한다(직접 접근 없음).
alter table public.research_results enable row level security;
-- (정책을 추가하지 않으면 service_role 외 모든 접근이 거부된다 — 의도된 기본값.)

-- 삭제권(ADR-006): 앱의 "내 서버 기록 삭제"가 anon_id 기준 전량 삭제한다(백엔드 DELETE /api/results).
