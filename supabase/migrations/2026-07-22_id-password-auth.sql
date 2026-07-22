-- =====================================================================
-- 3주차 인증 전환 (PRD v2.0 §1) — 구글 OAuth 제거 + 아이디/비밀번호 전환에 따른
-- Supabase 프로젝트 쪽 작업 스크립트
--
-- ⚠️ 이 파일은 위에서 아래로 "한 블록씩" 실행하는 절차서다. 통째로 복사해 Run 하지 말 것 —
--    2번(백업)을 건너뛰고 3번(삭제)이 실행되면 되돌릴 수 없다.
--
-- 실행 위치: Supabase 대시보드 > SQL Editor (postgres 권한으로 실행되므로 auth 스키마에 접근 가능)
--
-- 스키마(테이블/RLS/리더보드 함수)는 이 전환으로 바뀌지 않는다. 인증 "수단"만 교체하는 것이고,
-- auth.users / auth.uid() / profiles / meals / RLS 정책은 전부 기존 구조 그대로다
-- (PRD FR-1.3: "로그인 이후의 세션/토큰 발급과 데이터 접근 권한 체계는 기존 구조 그대로 유지").
-- 그래서 supabase/schema.sql은 손댈 필요가 없다.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) 먼저 대시보드 설정 2개를 바꾼다 (SQL 아님 — 콘솔에서 직접)
-- ---------------------------------------------------------------------
--
--   (1) Authentication > Sign In / Providers > Google  →  **Disable**
--       코드에서 구글 로그인을 지웠어도 provider가 켜져 있으면 엔드포인트는 살아있다. 반드시 끈다.
--       끈 뒤 Google Cloud Console의 OAuth 클라이언트도 삭제하면 완전히 정리된다.
--
--   (2) Authentication > Sign In / Providers > Email  →  **Confirm email: OFF**
--       앱은 아이디를 `<아이디>@mealyze.app`이라는 내부용 합성 이메일로 바꿔 GoTrue에 넘긴다
--       (src/lib/authId.js 참고). 실제로 수신 가능한 주소가 아니므로 확인 메일을 켜두면 가입이
--       "메일 확인 대기" 상태로 멈춰 PRD FR-1.1의 "가입 즉시 자동 로그인"이 깨진다.
--       · Email provider 자체는 켜둔 채로 "Confirm email"만 끈다.
--       · 앱 코드에도 방어 로직은 있지만(가입 후 곧바로 로그인 재시도), 이 설정이 정답이다.
--
--   (3) (권장) Authentication > Sign In / Providers > Email > Minimum password length → 8
--       클라이언트에서 이미 8자+영문+숫자를 강제하지만, 서버에도 같은 하한을 둔다.


-- ---------------------------------------------------------------------
-- 2) 백업 — PRD FR-1.3 "삭제 전 전체 백업 1회". 삭제 전 반드시 실행하고
--    각 결과 그리드 우측의 **Download CSV**로 내려받아 로컬에 보관할 것.
-- ---------------------------------------------------------------------

-- 2-1) 삭제 대상(구글로 가입한 계정) 목록
select
  u.id,
  u.email,
  i.provider,
  u.created_at,
  u.last_sign_in_at
from auth.users u
join auth.identities i on i.user_id = u.id
where i.provider = 'google'
order by u.created_at;

-- 2-2) 그 계정들의 신체정보(profiles)
select p.*
from public.profiles p
where p.id in (select user_id from auth.identities where provider = 'google');

-- 2-3) 그 계정들의 식단 기록(meals) — 실제 데이터 손실이 발생하는 곳
select m.*
from public.meals m
where m.user_id in (select user_id from auth.identities where provider = 'google');

-- 2-4) (참고) 전체 계정의 인증 수단 분포 — 삭제 범위를 눈으로 확인하는 용도
select
  coalesce(i.provider, '(identity 없음)') as provider,
  count(distinct u.id) as user_count
from auth.users u
left join auth.identities i on i.user_id = u.id
group by 1
order by 2 desc;


-- ---------------------------------------------------------------------
-- 3) 삭제 — 2번 백업 CSV를 손에 쥔 뒤에만 실행할 것. 되돌릴 수 없다.
--    auth.users 한 행만 지우면 profiles.id / meals.user_id의 FK가
--    `on delete cascade`라(supabase/schema.sql) 연결된 신체정보·식단이 함께 사라진다.
-- ---------------------------------------------------------------------

begin;

-- 지우기 직전에 몇 명이 지워질지 한 번 더 눈으로 확인(0이면 아래 delete도 아무 것도 하지 않는다).
select count(*) as will_delete
from auth.users
where id in (select user_id from auth.identities where provider = 'google');

delete from auth.users
where id in (select user_id from auth.identities where provider = 'google');

-- 이 시점에 위 숫자와 실제 삭제 행 수가 다르면 rollback; 을 실행하고 원인을 먼저 확인할 것.
commit;


-- ---------------------------------------------------------------------
-- 4) (선택) 마이그레이션 이전의 이메일/비밀번호 계정 처리
--    PRD FR-1.3이 삭제하라고 명시한 대상은 "구글 OAuth로 생성된 계정"뿐이라, 아래는 기본적으로
--    실행하지 않는다(주석 처리). 다만 이 계정들은 이메일이 `@mealyze.app` 형식이 아니라서
--    새 로그인 화면(아이디 입력)으로는 접근할 방법이 없다 — 사실상 접속 불가 상태로 남는다.
--    정리하고 싶다면 2번과 동일하게 백업부터 받은 뒤 아래 주석을 풀어 실행할 것.
-- ---------------------------------------------------------------------

-- 4-1) 대상 확인: 아이디 방식(@mealyze.app)이 아닌 이메일 계정
-- select u.id, u.email, u.created_at
-- from auth.users u
-- where u.email is not null and u.email not like '%@mealyze.app'
-- order by u.created_at;

-- 4-2) 삭제 (4-1 결과를 CSV로 백업한 뒤에만)
-- delete from auth.users
-- where email is not null and email not like '%@mealyze.app';


-- ---------------------------------------------------------------------
-- 5) 검증 — 아래 세 쿼리가 모두 기대값이어야 전환 완료
-- ---------------------------------------------------------------------

-- 5-1) 구글 identity 0건이어야 한다.
select count(*) as google_identities from auth.identities where provider = 'google';

-- 5-2) 고아 데이터 0건이어야 한다(cascade가 정상 동작했는지 확인).
select
  (select count(*) from public.profiles p where not exists (select 1 from auth.users u where u.id = p.id)) as orphan_profiles,
  (select count(*) from public.meals m    where not exists (select 1 from auth.users u where u.id = m.user_id)) as orphan_meals;

-- 5-3) 비밀번호가 해시로 저장돼 있는지 눈으로 확인(PRD FR-1.4).
--      encrypted_password는 `$2a$10$...` 형태의 bcrypt 해시여야 한다 — 평문/Base64면 즉시 중단.
--      (GoTrue가 해싱을 담당하므로 앱 코드가 비밀번호를 저장하는 경로는 존재하지 않는다.)
select
  email,
  left(encrypted_password, 7) as hash_prefix,
  length(encrypted_password)  as hash_length
from auth.users
order by created_at desc
limit 10;
