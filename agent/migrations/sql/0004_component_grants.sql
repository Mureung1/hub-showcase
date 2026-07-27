-- 구성요소별 읽기·쓰기 권한.
-- 정의는 docs/permission-matrix.md 3장과 4장을 따른다.

-- ============================================================ 읽기
-- 읽기는 쓰기보다 넓게 허용한다. 계보 추적과 검증이 상위 계층을 조회한다.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'cs_orchestrator','cs_agent_collect','cs_agent_knowledge','cs_agent_stats',
    'cs_agent_interpret','cs_agent_strategy','cs_agent_roadmap',
    'cs_pipe_ingest','cs_pipe_index','cs_pipe_aggregate','cs_pipe_lineage',
    'cs_pipe_verify','cs_serving'
  ] LOOP
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I', r);
  END LOOP;
END $$;

-- ============================================================ 쓰기
GRANT INSERT, UPDATE ON analysis_versions, active_analysis_versions,
  dataset_versions, knowledge_versions TO cs_orchestrator;

GRANT INSERT, UPDATE ON sources, source_assessments TO cs_agent_collect;
GRANT INSERT ON source_snapshots, source_observations TO cs_agent_collect;

GRANT INSERT, UPDATE ON knowledge_nodes, knowledge_edges, capabilities,
  capability_dimension_links, wiki_pages, wiki_revisions, wiki_evidence
  TO cs_agent_knowledge;

GRANT INSERT, UPDATE ON requirement_mentions, requirement_candidates,
  requirement_candidate_mentions, requirement_candidate_decisions,
  requirement_dimensions, requirement_dimension_versions, requirement_aliases,
  requirement_dimension_relations, requirement_taxonomy_versions,
  posting_requirement_assignments, saturation_observations TO cs_agent_stats;

GRANT INSERT, UPDATE ON analysis_claims, analysis_claim_evidence,
  coverage_assertions, analysis_outputs TO cs_agent_interpret;

GRANT INSERT, UPDATE ON checklist_concepts, checklist_items,
  checklist_item_mappings, analysis_outputs TO cs_agent_strategy;

GRANT INSERT, UPDATE ON roadmap_items, roadmap_item_fills, study_tracks,
  analysis_outputs TO cs_agent_roadmap;

GRANT INSERT, UPDATE ON postings, posting_versions TO cs_pipe_ingest;
GRANT INSERT ON source_snapshots, source_observations TO cs_pipe_ingest;

GRANT INSERT, UPDATE ON source_chunks, chunk_embeddings TO cs_pipe_index;

GRANT INSERT, UPDATE ON statistics_facts, capability_depth_profiles,
  analysis_outputs TO cs_pipe_aggregate;
-- 집계는 그래프의 순위 가중치만 갱신한다.
GRANT UPDATE (weight) ON knowledge_edges TO cs_pipe_aggregate;

GRANT INSERT, UPDATE ON knowledge_nodes, knowledge_edges, graph_paths
  TO cs_pipe_lineage;
GRANT DELETE ON graph_paths TO cs_pipe_lineage;

GRANT INSERT, UPDATE ON verification_results, repair_orders TO cs_pipe_verify;

-- 조사 요청. 요청자는 넣기만 하고 상태는 오케스트레이터만 바꾼다.
GRANT INSERT ON research_requests TO
  cs_agent_interpret, cs_agent_strategy, cs_agent_roadmap,
  cs_agent_stats, cs_pipe_verify;
GRANT UPDATE (status, priority, fulfilled_by_snapshot_ids, resolved_at)
  ON research_requests TO cs_orchestrator;

-- ============================================================ 계측
-- 전 실행 구성요소가 기록한다. 실행 기록의 결말만 갱신할 수 있다.
DO $$
DECLARE r text; t text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'cs_orchestrator','cs_agent_collect','cs_agent_knowledge','cs_agent_stats',
    'cs_agent_interpret','cs_agent_strategy','cs_agent_roadmap',
    'cs_pipe_ingest','cs_pipe_index','cs_pipe_aggregate','cs_pipe_lineage',
    'cs_pipe_verify'
  ] LOOP
    FOREACH t IN ARRAY ARRAY[
      'retrieval_runs','retrieval_queries','retrieval_candidates',
      'evidence_sets','evidence_set_members','evidence_usages',
      'agent_runs','agent_run_steps','tool_calls'
    ] LOOP
      EXECUTE format('GRANT INSERT ON %I TO %I', t, r);
    END LOOP;
    EXECUTE format(
      'GRANT UPDATE (stop_reason, tokens, cost, ended_at) ON agent_runs TO %I', r);
    EXECUTE format('GRANT UPDATE (ended_at) ON agent_run_steps TO %I', r);
  END LOOP;
END $$;

-- Express 는 조회만 한다.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
