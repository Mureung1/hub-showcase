-- =====================================================================
-- CJMT Supabase 스키마: profiles(사용자 신체정보 + 하루 권장 영양정보), meals(끼니 기록)
-- Supabase 대시보드 > SQL Editor에 전체를 붙여넣고 Run 하세요.
-- =====================================================================

-- gen_random_uuid()를 쓰기 위한 확장. Supabase 프로젝트는 보통 기본 활성화되어 있지만,
-- 꺼져 있는 환경을 위해 안전하게 한 번 더 켠다(이미 켜져 있으면 아무 일도 하지 않음).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) profiles: 사용자 1명당 1행. 신체정보 + 그 정보로 계산된 하루 권장 영양정보를 함께 보관한다.
--    id 자체가 auth.users(id)를 가리키는 PK라서(1:1 관계) 별도 user_id 컬럼이 필요 없다.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,

  -- 신체정보 (앱 Profile.jsx 입력값과 1:1 대응)
  age           smallint check (age > 0 and age < 150),
  sex           text check (sex in ('male', 'female')),
  height_cm     numeric(5,1) check (height_cm > 0),
  weight_kg     numeric(5,1) check (weight_kg > 0),
  activity      text check (activity in ('low', 'moderate', 'high')),
  conditions    text[] not null default '{}',  -- 기저질환 태그(사전 정의 key 또는 자유 입력 혼합)
  allergies     text[] not null default '{}',  -- 알레르기 태그(사전 정의 key 또는 자유 입력 혼합)

  -- 하루 권장 영양정보. calcRecommendedNutrients() 결과 그대로 저장.
  -- 6개 숫자 컬럼 대신 jsonb 하나로 묶어서 앱의 NUTRIENT_LABELS(단일 소스) 구조를 그대로 맞춘다.
  -- 형태: { "calories":n, "protein":n, "carbs":n, "fat":n, "fiber":n, "sodium":n }
  recommended   jsonb not null default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'CJMT 사용자 신체정보 + 하루 권장 영양정보. auth.users 1명당 1행.';

-- ---------------------------------------------------------------------
-- 2) meals: 끼니 기록. "사진 한 번 분석 = 한 끼 = 한 행"(앱 mealStore.js 저장 단위와 동일).
--    items: 그 끼니를 구성하는 음식 배열, total: items 영양소 합계(쓰기 시점에 계산해 캐싱).
-- ---------------------------------------------------------------------
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  date        date not null,                 -- 그 끼니를 먹은 날짜(YYYY-MM-DD)
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'etc')),

  -- 음식 목록. 각 원소 형태:
  -- { "name": string, "brand": string|null, "source": string,
  --   "nutrients": { "calories":n, "protein":n, "carbs":n, "fat":n, "fiber":n, "sodium":n } }
  items       jsonb not null,
  -- items 영양소 합계. 형태: { "calories":n, "protein":n, "carbs":n, "fat":n, "fiber":n, "sodium":n }
  total       jsonb not null default '{}',

  created_at  timestamptz not null default now(),

  -- addMealRecord()가 빈 items를 거부하는 것과 동일한 무결성 조건: 음식 최소 1개 이상.
  constraint meals_items_nonempty_array
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0)
);

comment on table public.meals is 'CJMT 끼니 기록. 사진 한 번 분석(=한 끼)이 한 행. items는 음식 배열, total은 그 합계.';

-- ---------------------------------------------------------------------
-- 3) 인덱스: RLS 정책이 매 행마다 검사하는 user_id/id 컬럼에 인덱스가 있어야 조회 성능이 나온다.
--    profiles.id는 이미 PK라 자동으로 인덱스가 있어 별도 인덱스가 필요 없다.
-- ---------------------------------------------------------------------
create index if not exists idx_meals_user_id on public.meals (user_id);
-- "내 오늘 끼니", "내 특정 기간 끼니"처럼 user_id + date로 함께 필터링하는 조회가 대부분이라 복합 인덱스로 커버.
create index if not exists idx_meals_user_id_date on public.meals (user_id, date);

-- ---------------------------------------------------------------------
-- 4) RLS(Row Level Security) 활성화 — 반드시 켜야 한다. 이게 빠지면 정책을 아무리 만들어도
--    테이블이 기본적으로 전체 공개된 것과 같아서 다른 사용자 데이터가 그대로 노출된다.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.meals    enable row level security;

-- ---------------------------------------------------------------------
-- 5) RLS 정책: "내 데이터만" 원칙 — auth.uid()(현재 로그인한 사용자)와 일치하는 행만 허용.
--    SELECT/INSERT/UPDATE/DELETE 4개를 각각 명시적으로 만든다(하나라도 빠지면 그 동작만 전면 차단됨).
--    `to authenticated`로 역할을 못박아, 로그인하지 않은 anon 요청은 정책 평가 전에 걸러지게 한다.
-- ---------------------------------------------------------------------

-- profiles: id 자체가 사용자 id이므로 auth.uid() = id로 비교한다.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- meals: user_id 컬럼과 비교한다.
create policy "meals_select_own"
  on public.meals for select
  to authenticated
  using (auth.uid() = user_id);

create policy "meals_insert_own"
  on public.meals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "meals_update_own"
  on public.meals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meals_delete_own"
  on public.meals for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 6) updated_at 자동 갱신(profiles). UPDATE될 때마다 updated_at을 현재 시각으로 맞춘다.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- =====================================================================
-- 점검용: 아래 두 SELECT를 SQL Editor에서 따로 실행해 실제 배포된 상태를 눈으로 확인할 수 있다.
-- (스키마를 이미 적용한 뒤, RLS/정책이 정말 켜져 있는지 재확인하고 싶을 때 이 파일 재실행 없이
-- 이 블록만 복사해서 써도 된다.)
-- =====================================================================

-- 1) 두 테이블 모두 rowsecurity = true여야 한다. false면 RLS가 꺼진 것 — 즉시 조치 필요.
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('profiles', 'meals');

-- 2) 테이블당 4개(select/insert/update/delete), 총 8개 행이 나와야 하고, qual/with_check 컬럼에
--    전부 auth.uid() 비교식이 들어있어야 한다(비어 있으면 그 동작은 무조건 막히거나 무조건 뚫린 것).
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename in ('profiles', 'meals')
-- order by tablename, cmd;
