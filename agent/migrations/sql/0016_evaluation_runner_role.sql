-- 평가 실행기 role 과 평가 표 권한.
-- 정의는 docs/permission-matrix.md 2장과 3장을 따른다.
--
-- 0003 이 만든 role 열세 개는 분석 실행 경로의 구성요소다. 평가 실행기는 그 경로
-- 밖에서 평가 세트를 적재하고 채점 결과를 기록한다. role 을 따로 두어 평가 표
-- 쓰기가 분석 산출물 쓰기와 섞이지 않게 한다.
--
-- role 은 0003 과 같이 NOLOGIN 이다. 접속은 하나의 사용자로 하고 거래마다
-- SET LOCAL ROLE 로 바꾼다.

-- ============================================================ role
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['cs_eval_runner'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', r);
    END IF;
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
  END LOOP;
END $$;

-- ============================================================ 읽기
-- 채점은 기대값을 분석 산출물과 대조하므로 읽기 범위가 쓰기 범위보다 넓다.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cs_eval_runner;

-- ============================================================ 쓰기
-- 평가 표 여섯 개에 넣기만 한다. 적재기는 이미 적재된 세트를 건너뛰고 채점은
-- 실행마다 새 행을 만들므로 UPDATE 와 DELETE 가 필요하지 않다.
GRANT INSERT ON evaluation_sets, evaluation_cases, evaluation_expected_items,
  evaluation_runs, evaluation_metrics, evaluation_failures TO cs_eval_runner;

-- ============================================================ 계측
-- 전 실행 구성요소가 기록한다. 근거는 docs/permission-matrix.md 3.1이다.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'retrieval_runs','retrieval_queries','retrieval_candidates',
    'evidence_sets','evidence_set_members','evidence_usages',
    'agent_runs','agent_run_steps','tool_calls'
  ] LOOP
    EXECUTE format('GRANT INSERT ON %I TO cs_eval_runner', t);
  END LOOP;
END $$;
GRANT UPDATE (stop_reason, tokens, cost, ended_at) ON agent_runs TO cs_eval_runner;
GRANT UPDATE (ended_at) ON agent_run_steps TO cs_eval_runner;

-- ============================================================ role 전환
-- PostgreSQL 16 부터 멤버십이 ADMIN·INHERIT·SET 세 옵션으로 나뉜다.
-- CREATEROLE 사용자가 만든 role 에는 ADMIN 만 자동으로 붙으므로 SET 을 명시한다.
DO $$
DECLARE r text; me text := current_user;
BEGIN
  FOREACH r IN ARRAY ARRAY['cs_eval_runner'] LOOP
    EXECUTE format('GRANT %I TO %I WITH SET TRUE', r, me);

    IF NOT pg_has_role(me, r, 'SET') THEN
      RAISE EXCEPTION '% 가 % 로 전환할 수 없다. SET 옵션 부여에 실패했다', me, r;
    END IF;
  END LOOP;
END $$;
