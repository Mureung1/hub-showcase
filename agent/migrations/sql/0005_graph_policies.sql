-- 그래프 층 분리.
-- 지식 구축 에이전트와 계보 기록 파이프라인이 같은 표를 쓰므로 행 수준 정책으로 나눈다.
-- 정의는 docs/permission-matrix.md 5.2를 따른다.

ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;

-- 읽기는 모든 구성요소에 열어 둔다.
CREATE POLICY knowledge_read_nodes ON knowledge_nodes FOR SELECT USING (true);
CREATE POLICY knowledge_read_edges ON knowledge_edges FOR SELECT USING (true);

-- 지식 구축은 사전 semantic 묶음만 만든다.
CREATE POLICY knowledge_pre_semantic_nodes ON knowledge_nodes
  FOR INSERT TO cs_agent_knowledge
  WITH CHECK (graph_layer = 'semantic');

CREATE POLICY knowledge_pre_semantic_edges ON knowledge_edges
  FOR INSERT TO cs_agent_knowledge
  WITH CHECK (
    graph_layer = 'semantic'
    AND edge_type IN ('POSTED_BY','BELONGS_TO_CLUSTER','REQUIRES',
                      'REQUIRES_CAPABILITY','MAPS_TO_STANDARD','PREREQUISITE_OF')
  );

CREATE POLICY knowledge_update_nodes ON knowledge_nodes
  FOR UPDATE TO cs_agent_knowledge
  USING (graph_layer = 'semantic') WITH CHECK (graph_layer = 'semantic');

CREATE POLICY knowledge_update_edges ON knowledge_edges
  FOR UPDATE TO cs_agent_knowledge
  USING (graph_layer = 'semantic') WITH CHECK (graph_layer = 'semantic');

-- 계보 기록은 provenance 층과 사후 semantic 묶음을 만든다.
CREATE POLICY lineage_nodes ON knowledge_nodes
  FOR INSERT TO cs_pipe_lineage WITH CHECK (true);

CREATE POLICY lineage_edges ON knowledge_edges
  FOR INSERT TO cs_pipe_lineage
  WITH CHECK (
    graph_layer = 'provenance'
    OR edge_type IN ('PROVEN_BY','USED_IN_CHANNEL','TEACHES')
  );

CREATE POLICY lineage_update_nodes ON knowledge_nodes
  FOR UPDATE TO cs_pipe_lineage USING (true) WITH CHECK (true);

CREATE POLICY lineage_update_edges ON knowledge_edges
  FOR UPDATE TO cs_pipe_lineage USING (true) WITH CHECK (true);

-- 집계는 순위 가중치만 갱신한다. 컬럼 단위 GRANT 가 범위를 좁힌다.
CREATE POLICY aggregate_weight ON knowledge_edges
  FOR UPDATE TO cs_pipe_aggregate USING (true) WITH CHECK (true);
