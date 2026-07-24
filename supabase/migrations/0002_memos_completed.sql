-- 메모에 완료(보관) 상태 추가 — "완료함" 화면(완료된 과제/메모를 모아 보고 복구·영구삭제)을 위해 필요.
-- tasks.completed와 동일한 패턴: 별도 이력 테이블 없이 boolean 컬럼 하나로 충분하다
-- (완료 여부가 한 번 뒤집히면 끝나는 1회성 상태라는 점이 tasks와 같음 — docs/data-model.md 2절 참고).

alter table memos add column completed boolean not null default false;
