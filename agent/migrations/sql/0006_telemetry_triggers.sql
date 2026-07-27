-- 계측 기록의 불변성.
-- 정의는 docs/permission-matrix.md 6.2를 따른다.
--
-- 실행 기록은 시작 시점에 행을 만들고 종료 시점에 결말을 채운다. 다른 표가
-- 실행 중에 agent_run_id 를 참조하므로 행이 먼저 있어야 한다. 완료 컬럼만
-- 컬럼 단위 GRANT 로 열고 식별자와 시작 시각은 트리거가 막는다.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'retrieval_runs','retrieval_queries','retrieval_candidates',
    'evidence_sets','evidence_set_members','evidence_usages','tool_calls'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_append_only BEFORE UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION block_append_only_mutation()', t, t);
  END LOOP;
END $$;

CREATE FUNCTION block_run_record_rewrite() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
  END IF;
  IF NEW.agent_run_id IS DISTINCT FROM OLD.agent_run_id
     OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION '% identity and start time are immutable', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_runs_completion_only
  BEFORE UPDATE OR DELETE ON agent_runs
  FOR EACH ROW EXECUTE FUNCTION block_run_record_rewrite();

CREATE FUNCTION block_step_record_rewrite() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
  END IF;
  IF NEW.step_id IS DISTINCT FROM OLD.step_id
     OR NEW.agent_run_id IS DISTINCT FROM OLD.agent_run_id
     OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION '% identity and start time are immutable', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_run_steps_completion_only
  BEFORE UPDATE OR DELETE ON agent_run_steps
  FOR EACH ROW EXECUTE FUNCTION block_step_record_rewrite();
