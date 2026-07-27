-- 4주차: profiles에 학교(급식·학식 조회, FR-1.1)와 직업(식당 추천, FR-2.1) 컬럼을 추가한다.
-- 이미 배포된 Supabase 프로젝트에 적용하는 증분 마이그레이션 — 신규 설치는 schema.sql이 이 컬럼을
-- 이미 포함하고 있으니 이 파일을 따로 실행할 필요 없다.
-- Supabase 대시보드 > SQL Editor에 붙여넣고 Run 하세요.

alter table public.profiles
  add column if not exists school_type        text check (school_type in ('k12', 'university')),
  add column if not exists school_office_code text,
  add column if not exists school_code        text,
  add column if not exists school_name        text,
  add column if not exists occupation         text check (occupation in ('elementary', 'middle_high', 'university', 'worker', 'other'));

-- 확인용: 아래 SELECT로 컬럼이 실제로 추가됐는지 확인할 수 있다.
-- select column_name, data_type from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
-- and column_name in ('school_type', 'school_office_code', 'school_code', 'school_name', 'occupation');
