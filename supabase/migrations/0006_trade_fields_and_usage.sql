-- 0006: 매매 기록 필드 확장(셋업 태그·감정 상태) + AI 사용 이력(과금 준비 ledger)
-- 근거: docs/prd.md §2 (데이터 모델), docs/roadmap.md WP-B B1
--
-- 배경:
--   1) 투자 습관 코칭을 위해 매매 기록에 구조화 입력이 필요하다.
--      - 셋업 태그(tags, 다중선택 free text[]): AI 복기의 반복 패턴 감지 재료.
--      - 감정 상태(emotion, 단일선택 enum): 복기의 emotion 축과 직결.
--   2) AI 복기는 향후 과금 모델 전환을 준비해야 한다. 현 단계는 호출 이력만
--      기록하고(제한 미적용) ai_usage_events 를 ledger로 둔다.

-- =========================================================
-- 1) 매매 기록 확장: 셋업 태그(다중) + 감정 상태(단일)
-- =========================================================
alter table trades add column if not exists tags text[] not null default '{}';
-- 셋업 태그 후보(프론트 상수, DB는 free text[]): 돌파·눌림목·추세추종·급등추격·낙폭매수·실적·뉴스/테마·배당/가치

alter table trades add column if not exists emotion text;

alter table trades drop constraint if exists trades_emotion_check;
alter table trades add constraint trades_emotion_check
  check (emotion in ('confident','anxious','impulsive','fomo','calm'));
-- confident(확신) · anxious(불안) · impulsive(조급) · fomo(FOMO) · calm(담담)

-- =========================================================
-- 2) AI 사용 이력 (향후 과금 모델 준비용 ledger — 현 단계는 기록만, 제한 미적용)
-- =========================================================
create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('review')),   -- 현재는 복기만. 향후 kind 확장(예: 'insight')
  trade_id uuid references trades(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_user_kind_created_idx
  on ai_usage_events (user_id, kind, created_at desc);

alter table ai_usage_events enable row level security;

drop policy if exists "ai_usage_events_select_own" on ai_usage_events;
create policy "ai_usage_events_select_own" on ai_usage_events
  for select using (auth.uid() = user_id);
-- insert는 review-agent(service role)가 수행 — RLS를 우회하므로 별도 insert 정책 불필요.
-- 웹 클라이언트는 읽기 전용.
-- 과금 전환 시나리오: 요청 전 월별 count(*) 검사 + 할당량 초과 시 요청 거부 로직만 추가하면 됨.
