-- =====================================================================
-- 게이미피케이션 v3: 듀오링고식 XP 리더보드 (FR-15)
-- Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run 하세요.
-- schema.sql(전체 스냅샷)에도 동일 내용이 반영되어 있습니다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) profiles.nickname — 리더보드에 표시할 닉네임. 가입 시 UserContext.jsx의 signup()이 즉시
--    채우고(온보딩 전에도 반영), 기존 계정은 아래 update로 1회 백필한다.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists nickname text;

update public.profiles p
set nickname = u.raw_user_meta_data ->> 'nickname'
from auth.users u
where p.id = u.id and p.nickname is null;

-- ---------------------------------------------------------------------
-- 2) get_xp_leaderboard: total_xp 기준 전체 순위 + 닉네임.
--
--    get_daily_leaderboard()(오늘의 영양 점수)와 달리 닉네임을 의도적으로 반환한다 — 이 앱은
--    지금까지 "다른 사용자 신원 절대 비노출"을 원칙으로 삼아왔지만(6주차 §7 주석 참고), 듀오링고식
--    경쟁 리더보드 UI는 다른 사람의 이름이 보여야 성립하므로 이 함수에 한해 의도적으로 그 원칙에서
--    벗어난다. 되돌리려면 이 함수만 제거하면 된다(get_daily_leaderboard는 영향 없음).
--
--    레벨/진행률은 반환하지 않는다 — src/lib/levelSystem.js가 total_xp만으로 클라이언트에서
--    항상 다시 계산한다(SQL에 레벨 공식을 복제하지 않는 기존 단일 소스 원칙, increment_total_xp
--    주석 참고).
-- ---------------------------------------------------------------------
create or replace function public.get_xp_leaderboard()
returns table (rank bigint, nickname text, total_xp integer, is_me boolean)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (order by p.total_xp desc, p.id) as rank,
    coalesce(p.nickname, '익명의 도전자') as nickname,
    p.total_xp,
    p.id = auth.uid() as is_me
  from public.profiles p
  where p.total_xp > 0
  order by p.total_xp desc, p.id
  limit 200;
$$;

revoke all on function public.get_xp_leaderboard() from public;
grant execute on function public.get_xp_leaderboard() to authenticated;

-- =====================================================================
-- 점검용
-- =====================================================================
-- select proname from pg_proc where proname = 'get_xp_leaderboard'; -- 1행이어야 정상
-- select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='nickname';
