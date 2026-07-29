-- =====================================================================
-- 게이미피케이션 v2: 레벨/XP + 퀘스트 게시판 + 뱃지·도감
-- Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run 하세요.
-- schema.sql(전체 스냅샷)에도 동일 내용이 반영되어 있습니다 — 신규 프로젝트는 schema.sql만 실행하면
-- 되고, 기존 프로젝트는 이 마이그레이션 파일만 추가로 실행하면 됩니다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) profiles.total_xp — 누적 총 경험치. 레벨/진행률은 src/lib/levelSystem.js가 이 값 하나로 매번
--    다시 계산한다(SQL에 공식을 복제하지 않음 — nutritionScore.js류 "단일 소스" 원칙).
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists total_xp integer not null default 0 check (total_xp >= 0);

-- ---------------------------------------------------------------------
-- 2) quest_claims — 날짜+퀘스트 단위 수령 이력. (user_id,date,quest_id) 유니크 제약이 같은 퀘스트를
--    같은 날 두 번 수령해 XP를 중복 지급받는 것을 막는 최종 방어선이다.
-- ---------------------------------------------------------------------
create table if not exists public.quest_claims (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  quest_id    text not null,
  xp_awarded  integer not null check (xp_awarded >= 0),
  created_at  timestamptz not null default now(),
  unique (user_id, date, quest_id)
);

comment on table public.quest_claims is '퀘스트 수령 이력. (user_id,date,quest_id) 유니크 제약으로 중복 지급 방지.';

create index if not exists idx_quest_claims_user_id on public.quest_claims (user_id);

alter table public.quest_claims enable row level security;

create policy "quest_claims_select_own"
  on public.quest_claims for select
  to authenticated
  using (auth.uid() = user_id);

create policy "quest_claims_insert_own"
  on public.quest_claims for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "quest_claims_update_own"
  on public.quest_claims for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quest_claims_delete_own"
  on public.quest_claims for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3) badge_unlocks — 뱃지 잠금해제 이력(영구 보존). 도감 화면은 조건을 재평가하지 않고 이 테이블에
--    있는 것만 신뢰한다(예: 스트릭이 끊겨도 이미 딴 뱃지는 유지). (user_id,badge_id) 유니크 제약으로
--    중복 잠금해제를 방지한다.
-- ---------------------------------------------------------------------
create table if not exists public.badge_unlocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  badge_id     text not null,
  unlocked_at  timestamptz not null default now(),
  unique (user_id, badge_id)
);

comment on table public.badge_unlocks is '뱃지 잠금해제 이력(영구 보존). (user_id,badge_id) 유니크 제약으로 중복 방지.';

create index if not exists idx_badge_unlocks_user_id on public.badge_unlocks (user_id);

alter table public.badge_unlocks enable row level security;

create policy "badge_unlocks_select_own"
  on public.badge_unlocks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "badge_unlocks_insert_own"
  on public.badge_unlocks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "badge_unlocks_update_own"
  on public.badge_unlocks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "badge_unlocks_delete_own"
  on public.badge_unlocks for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4) increment_total_xp — quest_claims insert가 성공했을 때만 이 RPC로 XP를 원자적으로 더한다.
--    profiles 행이 아직 없는 사용자(온보딩 전, 신체정보 미입력)도 upsert로 안전하게 생성된다 —
--    age/sex 등은 전부 nullable이라 total_xp만 있는 행도 CHECK 제약을 위반하지 않는다.
-- ---------------------------------------------------------------------
create or replace function public.increment_total_xp(p_delta integer)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.profiles (id, total_xp)
  values (auth.uid(), greatest(p_delta, 0))
  on conflict (id) do update
    set total_xp = public.profiles.total_xp + greatest(p_delta, 0)
  returning total_xp;
$$;

revoke all on function public.increment_total_xp(integer) from public;
grant execute on function public.increment_total_xp(integer) to authenticated;

-- =====================================================================
-- 점검용: 아래 SELECT로 실제 적용 상태를 눈으로 확인할 수 있다.
-- =====================================================================

-- select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='total_xp';
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('quest_claims', 'badge_unlocks');
