-- articles.fast_analysis: analyze 응답({ sentences, summaryBullets }) 캐시
-- articles.slow_analysis: analyze/details 응답({ terms, insight, marketSentiment }) 캐시
-- 같은 URL 재분석 시 Claude 재호출 없이 재사용해 비용/지연을 줄이고,
-- 단어장 자동 적재 부수효과가 매번 다른 LLM 출력 때문에 중복 저장되는 문제를 막는다.
alter table public.articles
  add column if not exists fast_analysis jsonb,
  add column if not exists slow_analysis jsonb;
