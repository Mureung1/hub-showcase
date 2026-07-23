-- SPEC-AI-001 8.3 — 관측 메타(JSONB 한 칸)
-- Provider 응답의 토큰 수·지연 등 관측 메타를 한 칸에 묶어 저장한다.
-- (예: inputTokens, outputTokens, latencyMs, 기타 provider 반환 메타)
-- model·prompt_version·started_at·completed_at 은 기존 전용 칸을 그대로 쓰므로
-- 추가 컬럼은 이 하나뿐이다.
--
-- NOT NULL DEFAULT '{}' — request_snapshot 과 동일 패턴. 기존 행은 빈 객체로 채워진다.
-- RLS·GRANT 추가 없음: source_answers 의 RLS 정책은 행 단위이고, GRANT 는 테이블 단위
-- (grants 마이그레이션의 all tables + default privileges)라 컬럼 추가의 영향을 받지 않는다.
--
-- response_meta 의 Zod 계약(shared 또는 api 경계)과 실제 기록은 T-016.2 에서 얹는다.
alter table source_answers
  add column response_meta jsonb not null default '{}'::jsonb;
