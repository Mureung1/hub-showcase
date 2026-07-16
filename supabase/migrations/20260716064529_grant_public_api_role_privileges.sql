-- 로컬/원격 권한 정합. 원격은 Supabase 기본 권한으로 이미 동일 → 멱등.
-- 함수 EXECUTE는 여기서 다루지 않는다(함수별 명시 grant 보존).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;
