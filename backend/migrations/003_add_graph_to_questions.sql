-- questions 테이블에 그래프 컬럼 추가.
-- AI 추천 문제에 함수 그래프가 필요할 때, 그릴 함수식을 JSON 배열 문자열로 저장한다.
-- (예: ["x^2-2*x"] 또는 ["2^x","log(x)"]) 그래프가 없으면 빈 문자열로 저장된다.
-- 그래프 자체는 프론트에서 이 함수식을 계산해 SVG 로 그린다.
-- Supabase 대시보드 > SQL Editor 에서 1회 실행하세요. (001, 002 실행 후)

alter table questions
  add column if not exists graph text;
