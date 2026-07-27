-- 구성요소별 데이터베이스 role 생성.
-- 정의는 docs/permission-matrix.md 2장을 따른다.
--
-- role 은 NOLOGIN 이다. 접속은 하나의 사용자로 하고 거래마다 SET LOCAL ROLE 로 바꾼다.
-- 접속 사용자가 각 role 의 구성원이므로 전환이 허용되고, 전환 후에는 그 role 의
-- GRANT 와 행 수준 정책만 적용된다.
--
-- 실패 지점을 좁힐 수 있도록 권한 부여와 정책은 다음 migration 으로 나눈다.

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'cs_orchestrator','cs_agent_collect','cs_agent_knowledge','cs_agent_stats',
    'cs_agent_interpret','cs_agent_strategy','cs_agent_roadmap',
    'cs_pipe_ingest','cs_pipe_index','cs_pipe_aggregate','cs_pipe_lineage',
    'cs_pipe_verify','cs_serving'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', r);
    END IF;
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
  END LOOP;
END $$;

-- 접속 사용자가 각 role 로 전환할 수 있게 구성원으로 넣는다.
--
-- PostgreSQL 16 부터 멤버십이 ADMIN·INHERIT·SET 세 옵션으로 나뉜다.
-- CREATEROLE 사용자가 만든 role 에는 ADMIN 만 자동으로 붙고 SET 은 붙지 않는다.
-- SET ROLE 로 전환하려면 SET 을 명시해야 한다.
DO $$
DECLARE r text; me text := current_user;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'cs_orchestrator','cs_agent_collect','cs_agent_knowledge','cs_agent_stats',
    'cs_agent_interpret','cs_agent_strategy','cs_agent_roadmap',
    'cs_pipe_ingest','cs_pipe_index','cs_pipe_aggregate','cs_pipe_lineage',
    'cs_pipe_verify','cs_serving'
  ] LOOP
    EXECUTE format('GRANT %I TO %I WITH SET TRUE', r, me);

    IF NOT pg_has_role(me, r, 'SET') THEN
      RAISE EXCEPTION '% 가 % 로 전환할 수 없다. SET 옵션 부여에 실패했다', me, r;
    END IF;
  END LOOP;
END $$;
