-- =====================================================================
-- Mealyze Supabase 스키마: profiles(사용자 신체정보 + 하루 권장 영양정보), meals(끼니 기록)
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

  -- 4주차: 학교(급식·학식 조회용, FR-1.1) + 직업(식당 추천용, FR-2.1). 둘 다 선택 사항 — 미설정(NULL)이면
  -- 기존 동작(급식·학식 토글/직업 맞춤 추천 노출 안 함)과 완전히 동일하다.
  school_type        text check (school_type in ('k12', 'university')),
  school_office_code text,  -- k12: NEIS 시도교육청코드(예: J10). university: 사용 안 함(NULL).
  school_code        text,  -- k12: NEIS 학교코드. university: 지원 대학 id(예: 'cnu').
  school_name        text,  -- 화면 표시용 학교명(예: '양서고등학교', '충남대학교').
  -- k12: NEIS SCHUL_KND_SC_NM("초등학교"/"중학교"/"고등학교" 등, 자유 문자열). university: NULL.
  -- 정밀 영양 산출 엔진의 학교급별 배식량 보정 계수에 쓰인다(6주차 §1, CafeteriaPanel.jsx).
  school_kind        text,
  occupation         text check (occupation in ('elementary', 'middle_high', 'university', 'worker', 'other')),

  -- 하루 권장 영양정보. calcRecommendedNutrients() 결과 그대로 저장.
  -- 6개 숫자 컬럼 대신 jsonb 하나로 묶어서 앱의 NUTRIENT_LABELS(단일 소스) 구조를 그대로 맞춘다.
  -- 형태: { "calories":n, "protein":n, "carbs":n, "fat":n, "fiber":n, "sodium":n }
  recommended   jsonb not null default '{}',

  -- 게이미피케이션 v2: 누적 총 경험치. 레벨/진행률은 src/lib/levelSystem.js가 이 값 하나로 매번
  -- 다시 계산한다(SQL에 공식을 복제하지 않음). 신체정보(age/sex 등)와 무관하게 독립적으로 갱신되므로
  -- 온보딩 전 사용자도 값을 쌓을 수 있다.
  total_xp      integer not null default 0 check (total_xp >= 0),

  -- 게이미피케이션 v3(FR-15): 리더보드에 표시할 닉네임. 가입 시 UserContext.jsx의 signup()이 즉시
  -- 채운다(온보딩 전에도 반영). get_xp_leaderboard()가 유일하게 이 값을 다른 사용자에게 노출한다.
  nickname      text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Mealyze 사용자 신체정보 + 하루 권장 영양정보. auth.users 1명당 1행.';

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

comment on table public.meals is 'Mealyze 끼니 기록. 사진 한 번 분석(=한 끼)이 한 행. items는 음식 배열, total은 그 합계.';

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

-- ---------------------------------------------------------------------
-- 7) 오늘의 순위(리더보드): profiles.recommended(개인별 하루 권장량) 대비 오늘 meals 합계로
--    100점 배점 점수를 서버(Postgres)에서 계산해, 등수/점수/본인 여부만 반환한다 — 다른
--    사용자의 이름·이메일·신체정보·식사 내역은 절대 클라이언트로 나가지 않는다(RLS를 우회하는
--    SECURITY DEFINER 함수이지만, RETURNS TABLE의 컬럼 자체가 rank/score/is_me뿐이라 그 이상은
--    애초에 반환할 수 없는 구조). src/lib/nutritionScore.js의 calcScore/getScoreBreakdown과
--    완전히 동일한 채점 공식(칼로리 적정성 40 / 단백질·탄수화물·지방 각 10 / 나트륨 30, 식이섬유는
--    배점에서 제외 — 5주차 §4)을 SQL로 옮긴 것 — 두 곳 중 하나만 고치면 랭킹과 개인 점수 표시가
--    어긋나니, 채점 공식을 바꿀 때는 항상 같이 고칠 것. 게스트는 Supabase 계정 자체가 없어 랭킹에
--    낄 수 없다(그래서 authenticated 사용자만 대상으로 하고, 실행 권한도 authenticated에만 준다).
-- ---------------------------------------------------------------------
create or replace function public.get_daily_leaderboard()
returns table (rank bigint, score numeric, is_me boolean)
language sql
security definer
set search_path = public
as $$
  with today_totals as (
    select
      m.user_id,
      sum((m.total->>'calories')::numeric) as calories,
      sum((m.total->>'protein')::numeric)  as protein,
      sum((m.total->>'carbs')::numeric)    as carbs,
      sum((m.total->>'fat')::numeric)      as fat,
      sum((m.total->>'sodium')::numeric)   as sodium
    from public.meals m
    -- "오늘"은 앱이 기록할 때 쓰는 한국 시각(KST) 기준 날짜여야 한다. current_date는 DB 타임존(Supabase
    -- 기본 UTC) 기준이라, 그대로 쓰면 00~09시(KST) 사이엔 어제 기록을 세고 오늘 기록을 놓쳐 다른 화면과
    -- 어긋난다. meals.date가 KST 로컬 날짜(toDateKey)로 저장되므로 여기도 KST로 맞춘다.
    where m.date = (now() at time zone 'Asia/Seoul')::date
    group by m.user_id
  ),
  scored as (
    -- 항목별 점수(정수로 반올림)를 배열로 만들고 sum()으로 더한다 — NULL(권장량이 0/없어 채점
    -- 불가한 항목)은 sum이 자동으로 무시하고, 전부 NULL이면 sum 결과도 NULL(채점 불가 → 랭킹 제외).
    -- src/lib/nutritionScore.js의 calcScore(항목별 반올림 points의 합계)와 정확히 같은 결과가
    -- 나오도록, 여기서도 각 항목을 개별적으로 반올림한 뒤 합산한다(합산 후 한 번에 반올림하지 않음).
    select
      t.user_id,
      (
        select sum(pts) from unnest(array[
          -- 칼로리 적정성(40): 목표의 90~110%면 만점, 그 밖은 50%/150% 지점에서 0점까지 선형 감점.
          case when (p.recommended->>'calories')::numeric > 0 then
            round(40 * least(1, greatest(0,
              case
                when coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric between 0.9 and 1.1 then 1
                when coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric < 0.9 then
                  (coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric - 0.5) / (0.9 - 0.5)
                else
                  (1.5 - coalesce(t.calories, 0) / (p.recommended->>'calories')::numeric) / (1.5 - 1.1)
              end
            )))
          end,
          -- 단백질·탄수화물·지방(각 10): 목표 달성률, 100%에서 만점(그 이상은 자름).
          case when (p.recommended->>'protein')::numeric > 0 then
            round(least(10, greatest(0, coalesce(t.protein, 0) / (p.recommended->>'protein')::numeric * 10)))
          end,
          case when (p.recommended->>'carbs')::numeric > 0 then
            round(least(10, greatest(0, coalesce(t.carbs, 0) / (p.recommended->>'carbs')::numeric * 10)))
          end,
          case when (p.recommended->>'fat')::numeric > 0 then
            round(least(10, greatest(0, coalesce(t.fat, 0) / (p.recommended->>'fat')::numeric * 10)))
          end,
          -- 나트륨(30): 상한 지표라 방향이 반대 — 한도 이내면 만점, 넘으면 초과 비율만큼 감점.
          case when (p.recommended->>'sodium')::numeric > 0 then
            round(
              case
                when coalesce(t.sodium, 0) <= (p.recommended->>'sodium')::numeric then 30
                else greatest(0, 30 * (1 - (t.sodium - (p.recommended->>'sodium')::numeric) / (p.recommended->>'sodium')::numeric))
              end
            )
          end
        ]) pts
      ) as score
    from today_totals t
    join public.profiles p on p.id = t.user_id
    where p.recommended is not null and p.recommended != '{}'::jsonb
  )
  select
    row_number() over (order by score desc) as rank,
    score,
    user_id = auth.uid() as is_me
  from scored
  where score is not null  -- 채점 가능한 영양소가 하나도 없는 프로필은 순위에서 제외
  order by score desc
  limit 100;
$$;

revoke all on function public.get_daily_leaderboard() from public;
grant execute on function public.get_daily_leaderboard() to authenticated;

-- ---------------------------------------------------------------------
-- 8) quest_claims: 게이미피케이션 v2 — 퀘스트(src/lib/quests.js) 수령 이력. 날짜+퀘스트 단위로
--    한 번만 수령할 수 있게 (user_id,date,quest_id) 유니크 제약을 최종 방어선으로 둔다.
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

create policy "quest_claims_select_own" on public.quest_claims for select to authenticated using (auth.uid() = user_id);
create policy "quest_claims_insert_own" on public.quest_claims for insert to authenticated with check (auth.uid() = user_id);
create policy "quest_claims_update_own" on public.quest_claims for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quest_claims_delete_own" on public.quest_claims for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 9) badge_unlocks: 게이미피케이션 v2 — 뱃지(src/lib/badgeSystem.js) 잠금해제 이력(영구 보존).
--    도감 화면은 조건을 재평가하지 않고 이 테이블에 있는 것만 신뢰한다(스트릭이 끊겨도 유지).
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

create policy "badge_unlocks_select_own" on public.badge_unlocks for select to authenticated using (auth.uid() = user_id);
create policy "badge_unlocks_insert_own" on public.badge_unlocks for insert to authenticated with check (auth.uid() = user_id);
create policy "badge_unlocks_update_own" on public.badge_unlocks for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "badge_unlocks_delete_own" on public.badge_unlocks for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 10) increment_total_xp: quest_claims insert가 성공했을 때만 이 RPC로 profiles.total_xp를
--     원자적으로 더한다. 프로필 행이 아직 없는 사용자(온보딩 전)도 upsert로 안전하게 생성된다 —
--     age/sex 등은 전부 nullable이라 total_xp만 있는 행도 CHECK 제약을 위반하지 않는다.
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

-- ---------------------------------------------------------------------
-- 11) security_questions: 게이미피케이션 v3 — 비밀번호 찾기(보안 질문 방식, FR-21). 이 앱의 로그인
--     ID는 합성 이메일(<id>@mealyze.app)로 등록되어 이메일 인증 재설정이 불가능해, 가입 시 등록한
--     보안 질문/답으로 본인 확인 후 서버가 직접 비밀번호를 바꿔준다. answer_hash/answer_salt는
--     사용자 본인에게도 노출하지 않으므로 RLS는 켜되 정책을 하나도 만들지 않는다 — 오직 서버
--     (SUPABASE_SERVICE_ROLE_KEY로 RLS 우회, server/supabaseAdmin.js)만 접근한다. login_id는
--     비밀번호 재설정이 로그인 전(세션 없음) 상태라 auth.uid()를 쓸 수 없어 별도로 둔다.
-- ---------------------------------------------------------------------
create table if not exists public.security_questions (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  login_id      text not null unique,
  question_id   text not null,
  answer_hash   text not null,   -- crypto.scrypt 해시(hex)
  answer_salt   text not null,   -- 사용자별 salt(hex)
  fail_count    smallint not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.security_questions is
  '비밀번호 찾기용 보안 질문/답변 해시. 클라이언트는 RLS로 전부 차단 — 서버(SERVICE_ROLE_KEY)만 읽고 쓴다.';

alter table public.security_questions enable row level security;
-- 정책 없음(의도적) — RLS enable만으로 anon/authenticated 접근이 전부 막힌다.

create or replace function public.set_updated_at_security_questions()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_security_questions_updated_at on public.security_questions;
create trigger trg_security_questions_updated_at
  before update on public.security_questions
  for each row
  execute function public.set_updated_at_security_questions();

-- ---------------------------------------------------------------------
-- 12) get_xp_leaderboard: 게이미피케이션 v3 — 듀오링고식 XP 리더보드(FR-15). total_xp 기준 전체
--     순위 + 닉네임을 반환한다. get_daily_leaderboard()(7번 섹션, 오늘의 영양 점수)와 달리 닉네임을
--     의도적으로 반환한다 — "다른 사용자 신원 절대 비노출" 원칙에서 이 함수에 한해 의도적으로
--     벗어난다(듀오링고식 경쟁 UI는 다른 사람 이름이 보여야 성립). 레벨/진행률은 반환하지 않는다 —
--     src/lib/levelSystem.js가 total_xp만으로 클라이언트에서 항상 다시 계산한다.
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
-- 점검용: 아래 SELECT를 SQL Editor에서 따로 실행해 실제 배포된 상태를 눈으로 확인할 수 있다.
-- (스키마를 이미 적용한 뒤, RLS/정책이 정말 켜져 있는지 재확인하고 싶을 때 이 파일 재실행 없이
-- 이 블록만 복사해서 써도 된다.)
-- =====================================================================

-- 1) 다섯 테이블 모두 rowsecurity = true여야 한다. false면 RLS가 꺼진 것 — 즉시 조치 필요.
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('profiles', 'meals', 'quest_claims', 'badge_unlocks', 'security_questions');

-- 2) profiles/meals/quest_claims/badge_unlocks는 테이블당 4개(select/insert/update/delete), 총
--    16개 행이 나와야 하고, qual/with_check 컬럼에 전부 auth.uid() 비교식이 들어있어야 한다(비어
--    있으면 그 동작은 무조건 막히거나 무조건 뚫린 것). security_questions는 정책이 0행이어야 정상
--    (서버만 접근하는 의도적 설계).
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename in ('profiles', 'meals', 'quest_claims', 'badge_unlocks')
-- order by tablename, cmd;
-- select count(*) from pg_policies where schemaname = 'public' and tablename = 'security_questions'; -- 0이어야 정상
