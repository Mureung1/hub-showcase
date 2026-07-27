-- 기준 데이터.
-- 실행마다 바뀌지 않는 값만 담는다. 실자료는 P5 에서 적재한다.

-- ============================================================ 직무
INSERT INTO job_roles (job_role_id, display_name, description, is_active) VALUES
  ('backend', '백엔드 개발자', '서버·API·데이터 처리를 담당하는 직무', true);

-- ============================================================ 기업군 6종
INSERT INTO company_clusters (cluster_id, display_name, definition, sort_order) VALUES
  ('bigtech_platform', '빅테크·플랫폼', '대규모 트래픽과 다수 서비스를 운영하는 플랫폼 기업', 1),
  ('startup',          '스타트업',     '초기·성장 단계의 소규모 조직', 2),
  ('b2b_saas',         'B2B SaaS',    '기업 고객에게 구독형 소프트웨어를 제공하는 기업', 3),
  ('fintech_finance',  '핀테크·금융',  '결제·정산·금융 서비스를 다루는 기업', 4),
  ('si_enterprise',    'SI·대기업',    '수주형 개발과 대기업 내부 시스템을 담당하는 조직', 5),
  ('game',             '게임사',       '게임 서비스와 실시간 처리를 다루는 기업', 6);

-- ============================================================ 기간
-- as_of_date 2026-07-27 기준 최근 12개월과 그 앞 12개월.
INSERT INTO periods (period_id, label, starts_on, ends_on, is_baseline) VALUES
  ('recent_12m', '최근 1년', '2025-07-27', '2026-07-27', true),
  ('prior_12m',  '이전 1년', '2024-07-27', '2025-07-26', false);

-- ============================================================ 지표 템플릿 7종
INSERT INTO metric_templates (metric_family, formula_version, input_arity, output_unit) VALUES
  ('posting_prevalence',                'v1', 'one_dimension',     'ratio'),
  ('requiredness_ratio',                'v1', 'one_dimension',     'ratio'),
  ('depth_distribution',                'v1', 'one_dimension',     'distribution'),
  ('cluster_contrast',                  'v1', 'dimension_cluster', 'difference'),
  ('cooccurrence',                      'v1', 'two_dimensions',    'ratio'),
  ('scope_expansion',                   'v1', 'scope_only',        'ratio'),
  ('entry_label_advanced_signal_rate',  'v1', 'scope_only',        'ratio');

INSERT INTO metric_template_parameters (metric_family, formula_version, parameter_name, parameter_type, required) VALUES
  ('posting_prevalence',               'v1', 'dimension_id',           'dimension', true),
  ('posting_prevalence',               'v1', 'period_id',              'period',    true),
  ('requiredness_ratio',               'v1', 'dimension_id',           'dimension', true),
  ('requiredness_ratio',               'v1', 'period_id',              'period',    true),
  ('depth_distribution',               'v1', 'dimension_id',           'dimension', true),
  ('depth_distribution',               'v1', 'period_id',              'period',    true),
  ('cluster_contrast',                 'v1', 'dimension_id',           'dimension', true),
  ('cluster_contrast',                 'v1', 'cluster_id',             'cluster',   true),
  ('cluster_contrast',                 'v1', 'period_id',              'period',    true),
  ('cooccurrence',                     'v1', 'dimension_id',           'dimension', true),
  ('cooccurrence',                     'v1', 'secondary_dimension_id', 'dimension', true),
  ('cooccurrence',                     'v1', 'period_id',              'period',    true),
  ('scope_expansion',                  'v1', 'period_id',              'period',    true),
  ('entry_label_advanced_signal_rate', 'v1', 'period_id',              'period',    true);

-- ============================================================ 지표 정책 v1
-- 실공고를 적재한 뒤 P13 에서 분포를 보고 재검토한다.
INSERT INTO metric_policy_versions (
  metric_policy_version, metric_family, formula_version,
  minimum_n, minimum_n_comparison, suppression_policy, uncertainty_method, effective_from
) VALUES
  ('mp_v1_prevalence',   'posting_prevalence',               'v1', 5, 10, 'label_low_confidence', 'wilson_95', now()),
  ('mp_v1_requiredness', 'requiredness_ratio',               'v1', 5, 10, 'label_low_confidence', 'wilson_95', now()),
  ('mp_v1_depth',        'depth_distribution',               'v1', 5, 10, 'label_low_confidence', 'wilson_95', now()),
  ('mp_v1_contrast',     'cluster_contrast',                 'v1', 5, 10, 'label_not_comparable', 'wilson_95', now()),
  ('mp_v1_cooccurrence', 'cooccurrence',                     'v1', 5, 10, 'label_low_confidence', 'none',      now()),
  ('mp_v1_scope_exp',    'scope_expansion',                  'v1', 5, 10, 'label_low_confidence', 'wilson_95', now()),
  ('mp_v1_entry_signal', 'entry_label_advanced_signal_rate', 'v1', 5, 10, 'label_low_confidence', 'wilson_95', now());

-- ============================================================ 온톨로지 v1
-- 유형 목록의 근거는 docs/ontology-v1.md 다.
INSERT INTO ontology_versions (
  ontology_version, graph_layer, node_types, edge_types,
  allowed_connections, required_evidence_by_edge_type, effective_from
) VALUES (
  'v1', 'semantic',
  '["JobRole","Posting","Company","CompanyCluster","RequirementDimension","Capability","Technology","Standard","ProofArtifact","Channel","LearningResource","Project"]'::jsonb,
  '["POSTED_BY","BELONGS_TO_CLUSTER","REQUIRES","REQUIRES_CAPABILITY","MAPS_TO_STANDARD","PREREQUISITE_OF","PROVEN_BY","USED_IN_CHANNEL","TEACHES"]'::jsonb,
  '{
    "POSTED_BY":           {"src": ["Posting"], "dst": ["Company"], "taxonomy_version": false},
    "BELONGS_TO_CLUSTER":  {"src": ["Company"], "dst": ["CompanyCluster"], "taxonomy_version": false},
    "REQUIRES":            {"src": ["Posting"], "dst": ["RequirementDimension","Technology"], "taxonomy_version": true},
    "REQUIRES_CAPABILITY": {"src": ["RequirementDimension","Technology"], "dst": ["Capability"], "taxonomy_version": true},
    "MAPS_TO_STANDARD":    {"src": ["Capability"], "dst": ["Standard"], "taxonomy_version": false},
    "PREREQUISITE_OF":     {"src": ["Capability"], "dst": ["Capability"], "taxonomy_version": false},
    "PROVEN_BY":           {"src": ["Capability"], "dst": ["ProofArtifact"], "taxonomy_version": false},
    "USED_IN_CHANNEL":     {"src": ["ProofArtifact"], "dst": ["Channel"], "taxonomy_version": false},
    "TEACHES":             {"src": ["LearningResource"], "dst": ["Capability"], "taxonomy_version": false}
  }'::jsonb,
  '{
    "REQUIRES": "assignment",
    "REQUIRES_CAPABILITY": "capability_dimension_link",
    "MAPS_TO_STANDARD": "dimension_version_mapping",
    "PREREQUISITE_OF": "wiki_prerequisites",
    "PROVEN_BY": "checklist_item",
    "USED_IN_CHANNEL": "checklist_item",
    "TEACHES": "study_track"
  }'::jsonb,
  now()
), (
  'v1', 'provenance',
  '["SourceSnapshot","Chunk","RequirementMention","Assignment","StatisticFact","AnalysisClaim","ChecklistItem","RoadmapItem","AnalysisOutput","AgentRun"]'::jsonb,
  '["PART_OF","EVIDENCED_BY","ASSIGNED_TO","COMPUTED_FROM","SUPPORTED_BY","CONTRADICTED_BY","DERIVED_FROM","FILLS","PRODUCED_BY"]'::jsonb,
  '{
    "PART_OF":         {"src": ["Chunk"], "dst": ["SourceSnapshot"], "taxonomy_version": false},
    "EVIDENCED_BY":    {"src": ["RequirementMention"], "dst": ["Chunk"], "taxonomy_version": false},
    "ASSIGNED_TO":     {"src": ["RequirementMention"], "dst": ["RequirementDimension","Technology"], "taxonomy_version": true},
    "COMPUTED_FROM":   {"src": ["StatisticFact"], "dst": ["Assignment"], "taxonomy_version": false},
    "SUPPORTED_BY":    {"src": ["AnalysisClaim"], "dst": ["Chunk","StatisticFact"], "taxonomy_version": false},
    "CONTRADICTED_BY": {"src": ["AnalysisClaim"], "dst": ["Chunk"], "taxonomy_version": false},
    "DERIVED_FROM":    {"src": ["ChecklistItem"], "dst": ["AnalysisClaim"], "taxonomy_version": false},
    "FILLS":           {"src": ["RoadmapItem"], "dst": ["ChecklistItem"], "taxonomy_version": false},
    "PRODUCED_BY":     {"src": ["AnalysisOutput"], "dst": ["AgentRun"], "taxonomy_version": false}
  }'::jsonb,
  '{
    "EVIDENCED_BY": "requirement_mention",
    "ASSIGNED_TO": "assignment",
    "COMPUTED_FROM": "statistic_fact",
    "SUPPORTED_BY": "analysis_claim_evidence",
    "CONTRADICTED_BY": "analysis_claim_evidence",
    "DERIVED_FROM": "checklist_item",
    "FILLS": "roadmap_item_fill",
    "PRODUCED_BY": "agent_run"
  }'::jsonb,
  now()
);

-- ============================================================ 백엔드 분류체계 v1 (빈 상태)
-- 차원은 P9~P11 에서 발견하고 승격한다.
INSERT INTO requirement_taxonomies (taxonomy_id, job_role_id) VALUES
  ('tax_backend', 'backend');

INSERT INTO requirement_taxonomy_versions (
  taxonomy_version_id, taxonomy_id, version_number, taxonomy_policy_version, published_at
) VALUES
  ('tx_backend_v1', 'tax_backend', 1, 'tp_v1', now());
