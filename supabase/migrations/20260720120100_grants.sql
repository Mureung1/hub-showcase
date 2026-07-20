-- SPEC-DB-001 — 서비스 테이블 역할 GRANT
-- RLS는 "행"을 제한하지만, PostgREST 역할(authenticated·service_role)은 테이블 레벨
-- GRANT가 없으면 "permission denied"가 난다. RLS가 켜져 있으므로 authenticated에
-- DML을 부여해도 행 접근은 정책으로 계속 제한된다. service_role은 BYPASSRLS(시스템 쓰기).

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

-- 이후 추가되는 테이블에도 동일 권한이 자동 부여되도록(재현성).
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
