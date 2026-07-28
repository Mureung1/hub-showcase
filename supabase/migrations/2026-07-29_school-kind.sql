-- 학교 종류(초/중/고, NEIS SCHUL_KND_SC_NM)를 profiles에 추가한다. 4주차 school_* 컬럼 추가 때
-- 함께 넣었어야 했는데 누락됐던 것 — 6주차 정밀 영양 산출 엔진이 학교급별 배식량 보정 계수
-- (PORTION_FACTORS: 초 0.75 / 중 0.95 / 고 1.05)를 적용하는 데 필요한데, 이 컬럼이 없어 로그인
-- 계정은 지금까지 저장 즉시 이 값을 잃고 계수 1(보정 없음)로 폴백해왔다(게스트는 localStorage라
-- 영향 없었음). 이미 배포된 Supabase 프로젝트에 적용하는 증분 마이그레이션 — 신규 설치는
-- schema.sql이 이 컬럼을 이미 포함하고 있으니 이 파일을 따로 실행할 필요 없다.
-- Supabase 대시보드 > SQL Editor에 붙여넣고 Run 하세요.
--
-- CHECK 제약을 두지 않는다 — NEIS SCHUL_KND_SC_NM은 "초등학교"/"중학교"/"고등학교" 등 자유
-- 문자열이고, 대학 계정은 애초에 이 값을 채우지 않아(school_type='university') NULL로 남는다.

alter table public.profiles
  add column if not exists school_kind text;

-- 확인용: 아래 SELECT로 컬럼이 실제로 추가됐는지 확인할 수 있다.
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
-- and column_name = 'school_kind';
