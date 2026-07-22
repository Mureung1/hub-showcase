-- questions 테이블에 과목(단원) 컬럼 추가.
-- 선생님이 질문을 남길 때 고등학교 수학 과목(공통수학1 등)을 지정할 수 있게 한다.
-- Supabase 대시보드 > SQL Editor 에서 1회 실행하세요.
-- 기존 질문은 subject 가 NULL 로 남으며, 프론트에서 배지 없이 정상 표시됩니다.

alter table questions
  add column if not exists subject text;
