-- 사용자가 직접 입력한 공고와 그 개별 분석 결과를 담는다.
-- 정의는 CONTRACT 6.1 이고 흐름은 docs/architecture.md 11장이다.
-- 통계 테이블과 외래키로 잇지 않는다. 사용자 입력이 모집단에 섞이면 직무 기준선과
-- 모든 지표가 오염된다. 두 표는 원문 해시로 캐시를 찾는 별도의 저장 공간이다.

CREATE TABLE user_postings (
  user_posting_id text PRIMARY KEY,          -- up_<hash 앞 16자>
  content_hash    text NOT NULL,             -- 정규화 원문의 SHA-256 hex 64
  normalized_text text NOT NULL,
  char_length     integer NOT NULL,
  job_role_id     text NOT NULL,             -- FK 없음. 값만 담는다
  detected_by     text NOT NULL CHECK (detected_by IN ('user_selected','rule','model')),
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_hash),
  CHECK (char_length(content_hash) = 64)
);

-- `analysis_version` 과 `taxonomy_version_id` 는 값만 담는다. 어느 활성 버전을 기준
-- 삼아 만든 결과인지 기록하되, 버전 표를 향한 외래키를 두지 않아 사용자 입력이
-- 분석 버전의 계보에 끼어들지 않게 한다.
CREATE TABLE user_posting_analyses (
  user_analysis_id    text PRIMARY KEY,      -- ua_<hash 앞 16자>_<type>
  user_posting_id     text NOT NULL REFERENCES user_postings ON DELETE RESTRICT,
  analysis_version    text NOT NULL,         -- FK 없음. 어느 활성 버전을 기준 삼았는지 기록
  taxonomy_version_id text NOT NULL,
  output_type         text NOT NULL CHECK (output_type IN ('interpretation','strategy','roadmap')),
  payload             jsonb NOT NULL,
  produced_by         text NOT NULL CHECK (produced_by IN ('agent','seed')),
  generated_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_posting_id, analysis_version, output_type)
);
CREATE INDEX idx_user_posting_analyses_posting_type
  ON user_posting_analyses (user_posting_id, output_type);

-- ============================================================ 권한
-- 0004 의 GRANT 는 그때 있던 표에만 미친다. 새 표의 권한은 여기서 준다.
-- 방식은 docs/permission-matrix.md 3장·4장과 0004_component_grants.sql 을 따른다.

-- 읽기는 넓게 허용한다.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'cs_orchestrator','cs_agent_collect','cs_agent_knowledge','cs_agent_stats',
    'cs_agent_interpret','cs_agent_strategy','cs_agent_roadmap',
    'cs_pipe_ingest','cs_pipe_index','cs_pipe_aggregate','cs_pipe_lineage',
    'cs_pipe_verify','cs_serving','cs_eval_runner'
  ] LOOP
    EXECUTE format('GRANT SELECT ON user_postings TO %I', r);
    EXECUTE format('GRANT SELECT ON user_posting_analyses TO %I', r);
  END LOOP;
END $$;

-- Express 는 조회만 한다. 저장은 FastAPI 온디맨드 경로가 한다.
GRANT SELECT ON user_postings, user_posting_analyses TO service_role;

-- 입력 공고의 등록은 온디맨드 체인을 여는 오케스트레이터가 한다.
-- 같은 원문이 다시 들어오면 캐시가 적중하므로 갱신할 일이 없다. INSERT 만 준다.
GRANT INSERT ON user_postings TO cs_orchestrator;

-- 개별 분석 결과는 산출물 종류를 만든 에이전트가 각각 넣는다.
-- `analysis_outputs` 의 쓰기 범위와 같은 배분이다.
GRANT INSERT ON user_posting_analyses TO
  cs_agent_interpret, cs_agent_strategy, cs_agent_roadmap;
