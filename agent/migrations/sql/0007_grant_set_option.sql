-- role 전환 권한 보정.
--
-- 0003 은 pg_has_role(..., 'MEMBER') 로 멤버십을 확인했다. PostgreSQL 16 부터
-- 멤버십이 ADMIN·INHERIT·SET 세 옵션으로 나뉘고, CREATEROLE 사용자가 만든
-- role 에는 ADMIN 만 자동으로 붙는다. MEMBER 검사는 ADMIN 만 있어도 참이므로
-- 부여를 건너뛰었고 SET ROLE 이 거부됐다.
--
-- 0003 은 이후 설치를 위해 고쳤고, 이 migration 은 이미 만들어진 데이터베이스를
-- 보정한다. 검사가 실패하면 예외로 멈춘다.

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
