-- 엣지별 필수 근거를 docs/ontology-v1.md 4장의 정의와 일치시킨다.
--
-- `0002_seed_reference.sql` 이 시드한 `required_evidence_by_edge_type` 이 문서와 네
-- 곳에서 어긋난다. 검사기(`graph/ontology.py`)는 문서가 아니라 이 컬럼을 읽어
-- 판정하므로, 어긋난 값이 그대로 실행의 규칙이 되어 있다.
--
--   BELONGS_TO_CLUSTER  없음            -> cluster_membership
--   COMPUTED_FROM       statistic_fact  -> 요구하지 않음
--   PRODUCED_BY         agent_run       -> 요구하지 않음
--   DERIVED_FROM        checklist_item  -> analysis_claim
--
-- `COMPUTED_FROM` 은 `StatisticFact -> Assignment` 이고 `PRODUCED_BY` 는
-- `AnalysisOutput -> AgentRun` 이다. 출발 노드가 이미 가리키는 행을 근거로 다시
-- 요구하는 것은 순환이며 아무 사실도 확인하지 않는다. 두 엣지는 외래키와 집계
-- 입력으로 성립한다.
--
-- `BELONGS_TO_CLUSTER` 는 docs/ontology-v1.md 5장의 파생 엣지다. 파생 엣지는 원천
-- 행을 가리켜야 `파생 일치` 검사(같은 문서 7장)가 성립한다. 근거를 요구하지 않으면
-- 그 검사가 이 엣지에 대해 무력하다.
--
-- `DERIVED_FROM` 은 `ChecklistItem -> AnalysisClaim` 이므로 근거는 도착점인
-- `analysis_claims.claim_id` 다. 출발점인 체크리스트 항목은 근거가 아니라 엣지의 한 끝이다.
--
-- 온톨로지 버전을 v2 로 올리지 않는다. docs/ontology-v1.md 8장의 버전 변경 규칙은
-- 정의가 바뀔 때의 절차이고, 여기서 바뀌는 것은 정의가 아니라 그 정의를 옮겨 적은
-- 시드의 값이다. v1 의 필수 근거는 처음부터 문서에 적힌 그대로이며 새 버전을
-- 발행하면 바뀐 적 없는 정의에 두 번째 버전을 붙이고 직무 그래프 전량 재구축을
-- 요구하게 된다.
--
-- `ontology_versions` 는 `OPERATOR_ONLY_TABLES` 다
-- (src/careersignal/domain/permissions.py). 어떤 구성요소도 이 표에 쓰지 않으므로
-- migration 이 유일한 갱신 경로다.
--
-- `required_evidence_by_edge_type` 컬럼만 갱신한다. `node_types`·`edge_types`·
-- `allowed_connections` 는 문서와 이미 일치하므로 건드리지 않는다.

UPDATE ontology_versions
SET required_evidence_by_edge_type = '{
  "BELONGS_TO_CLUSTER": "cluster_membership",
  "REQUIRES": "assignment",
  "REQUIRES_CAPABILITY": "capability_dimension_link",
  "MAPS_TO_STANDARD": "dimension_version_mapping",
  "PREREQUISITE_OF": "wiki_prerequisites",
  "PROVEN_BY": "checklist_item",
  "USED_IN_CHANNEL": "checklist_item",
  "TEACHES": "study_track"
}'::jsonb
WHERE ontology_version = 'v1' AND graph_layer = 'semantic';

UPDATE ontology_versions
SET required_evidence_by_edge_type = '{
  "EVIDENCED_BY": "requirement_mention",
  "ASSIGNED_TO": "assignment",
  "SUPPORTED_BY": "analysis_claim_evidence",
  "CONTRADICTED_BY": "analysis_claim_evidence",
  "DERIVED_FROM": "analysis_claim",
  "FILLS": "roadmap_item_fill"
}'::jsonb
WHERE ontology_version = 'v1' AND graph_layer = 'provenance';
