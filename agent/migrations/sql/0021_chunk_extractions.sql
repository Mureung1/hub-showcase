-- 추출을 마친 청크를 표현이 나왔는지와 무관하게 기록한다.
-- 정의는 docs/erd.md 6.2 이고 공통 규약은 같은 문서 2.1·2.3·2.4 다.
--
-- 지금까지 "이 청크를 처리했다" 의 유일한 자국이 `requirement_mentions` 의 행이었다
-- (`repositories/statistics.py` 의 `chunks_to_extract`·`extracted_chunks`). 회사 소개·
-- 복리후생·전형 절차 청크는 요구 표현이 하나도 없는 것이 정상이므로 행이 남지 않고,
-- 그 청크는 다음 실행의 대상에 다시 들어온다. 실측으로 1회차가 청크 660개를 전부
-- 처리한 뒤 2회차의 대상이 372개였다. 표현이 0개인 청크가 영구히 다시 호출된다.
--
-- 그래서 처리 사실 자체를 담는 표를 따로 둔다. `mention_count = 0` 이 정상값이며,
-- 0 을 기록하는 것이 이 표의 존재 이유다.
--
-- 기본키가 (chunk_id, dataset_version) 이다. 청크는 스냅샷에서 결정적으로 나오고
-- 스냅샷은 변경되지 않으므로 한 데이터셋 버전 안에서 한 청크를 두 번 처리할 이유가
-- 없다. 데이터셋 버전이 다르면 다시 뽑는다. `chunk_embeddings` 와 같은 꼴이다
-- (docs/erd.md 5.2).

CREATE TABLE chunk_extractions (
  chunk_id          text NOT NULL REFERENCES source_chunks ON DELETE RESTRICT,
  dataset_version   text NOT NULL REFERENCES dataset_versions ON DELETE RESTRICT,
  extraction_run_id text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  mention_count     integer NOT NULL CHECK (mention_count >= 0),
  extracted_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_id, dataset_version)
);

-- 대상 조회의 `NOT EXISTS` 는 (chunk_id, dataset_version) 두 컬럼으로 판정하므로
-- 기본키 인덱스가 그대로 쓰인다. 별도 인덱스를 두지 않는다.
-- 데이터셋 단위 조회(`extracted_chunks`)는 선두 컬럼이 chunk_id 라 기본키를 쓰지
-- 못한다.
CREATE INDEX idx_chunk_extractions_dataset ON chunk_extractions (dataset_version);

-- ============================================================ 이관
-- 이미 표현이 나온 청크를 다시 부르지 않는다. 그 청크의 처리 사실은
-- `requirement_mentions` 에 남아 있으므로 여기서 옮겨 담는다.
--
-- `extraction_run_id` 는 그 청크의 mention 가운데 하나에서 가져온다. 한 청크의
-- mention 은 한 실행이 함께 만들지만 재실행이 섞였을 수 있으므로 `min` 으로 하나를
-- 고정한다. 어느 것을 골라도 "이 청크를 뽑은 실행" 이라는 뜻은 같고, `min` 은
-- 결정적이라 이관을 다시 돌려도 같은 값이 된다.
--
-- `extracted_at` 은 기본값 now() 로 채워진다. 원래 뽑은 시각이 아니라 이관 시각이다.
-- 표가 없던 때의 시각을 지어내지 않는다. 원래 시각은 `requirement_mentions` 를 통해
-- `agent_runs.started_at` 에서 읽을 수 있다.
--
-- 표현이 0개였던 청크는 이 이관으로 채울 수 없다. 자국이 아무 데도 없기 때문이다.
-- 그 청크들(실측 372개)은 다음 실행에서 한 번 더 호출되고, 그때 이 표에 0 으로
-- 기록되어 그 뒤로는 영구히 대상에서 빠진다. 한 번의 낭비로 끝난다.
INSERT INTO chunk_extractions (chunk_id, dataset_version, extraction_run_id, mention_count)
SELECT m.chunk_id,
       m.dataset_version,
       min(m.extraction_run_id),
       count(*)
FROM requirement_mentions m
GROUP BY m.chunk_id, m.dataset_version;

-- ============================================================ 권한
-- `0004_component_grants.sql` 은 이미 적용된 migration 이라 고치지 않는다. 그 파일의
-- `GRANT SELECT ON ALL TABLES` 는 실행 시점의 표만 덮으므로 이후에 만든 표에는
-- 미치지 않는다. 새 표의 권한은 여기서 준다.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'cs_orchestrator','cs_agent_collect','cs_agent_knowledge','cs_agent_stats',
    'cs_agent_interpret','cs_agent_strategy','cs_agent_roadmap',
    'cs_pipe_ingest','cs_pipe_index','cs_pipe_aggregate','cs_pipe_lineage',
    'cs_pipe_verify','cs_serving','cs_eval_runner'
  ] LOOP
    EXECUTE format('GRANT SELECT ON chunk_extractions TO %I', r);
  END LOOP;
END $$;

-- Express 는 조회만 한다.
GRANT SELECT ON chunk_extractions TO service_role;

-- 쓰는 구성요소는 통계 분석 에이전트 하나다. 추출이 이 표를 만드는 유일한 자리다
-- (docs/permission-matrix.md 3장, `domain/permissions.py` 의 `_WRITE_SCOPE`).
GRANT INSERT, UPDATE ON chunk_extractions TO cs_agent_stats;
