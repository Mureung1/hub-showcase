-- 0004: Discord 계정 연동 선행 조건 (profiles 자동생성 트리거) + 연동 코드 임시 테이블
-- 근거: docs/discord-linking.md §2 (데이터 모델), docs/roadmap.md WP-A A1
--
-- 배경:
--   1) 웹 회원가입(auth.users insert)은 profiles 행을 만들지 않아 watchlists/conditions
--      insert가 FK로 실패한다(신규 가입 blocker, docs/roadmap.md WP-A 최우선) —
--      handle_new_user 트리거로 해소.
--   2) discord_links.discord_user_id는 NOT NULL이라 봇 검증 전 "대기 중 코드"를
--      discord_links에 못 넣는다. 별도 임시 테이블(discord_link_codes)에 코드를 두고,
--      봇이 검증하면 discord_links에 upsert하고 코드는 삭제한다.

-- =========================================================
-- 1) 기존 계정 백필: profiles 없는 auth.users 행에 profiles 생성
--    (scripts/ 로 만든 기존 test 계정 외에도 profiles 누락 계정이 있을 수 있어 안전 처리)
-- =========================================================
insert into public.profiles (id)
select u.id
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- =========================================================
-- 2) 회원가입 시 profiles 자동 생성 (웹 signUp 대응)
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- 3) 대기 중 연동 코드 (봇 검증 전 임시, 단명)
--    discord_links.discord_user_id가 NOT NULL이라 봇 입력 전 코드를 거기 못 두므로 별도 테이블.
-- =========================================================
create table if not exists discord_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table discord_link_codes enable row level security;

drop policy if exists "dlc_select_own" on discord_link_codes;
create policy "dlc_select_own" on discord_link_codes
  for select using (auth.uid() = user_id);

drop policy if exists "dlc_insert_own" on discord_link_codes;
create policy "dlc_insert_own" on discord_link_codes
  for insert with check (auth.uid() = user_id);

drop policy if exists "dlc_update_own" on discord_link_codes;
create policy "dlc_update_own" on discord_link_codes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dlc_delete_own" on discord_link_codes;
create policy "dlc_delete_own" on discord_link_codes
  for delete using (auth.uid() = user_id);

-- 참고: 기존 계정(스크립트 생성)엔 이미 profiles 행이 있어 트리거의 on conflict do nothing으로 안전.
-- 트리거는 신규 가입분에 실질 작동하고, 위 1)번 백필은 과거 누락분을 일회성으로 정리한다.
