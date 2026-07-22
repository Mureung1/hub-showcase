-- questions 테이블에 단원 컬럼 추가.
-- 선생님이 과목(공통수학1 등)을 고른 뒤 세부 단원(다항식 등)까지 지정할 수 있게 한다.
-- Supabase 대시보드 > SQL Editor 에서 1회 실행하세요. (001 실행 후)
-- 기존 질문은 unit 이 NULL 로 남으며, 프론트에서 배지 없이 정상 표시됩니다.

alter table questions
  add column if not exists unit text;
