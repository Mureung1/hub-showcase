-- CareerSignal 초기 스키마.
-- 정의는 docs/erd.md 를 따른다. 절 번호는 그 문서와 일치한다.
-- 벡터 차원 1536 은 P2-2 스모크 테스트에서 확인한 값이다.

-- ============================================================ 확장
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================ 수직 슬라이스 잔재 제거
DROP TABLE IF EXISTS postings CASCADE;

-- ============================================================ 3. 기준 테이블
CREATE TABLE job_roles (
  job_role_id   text PRIMARY KEY,
  display_name  text NOT NULL,
  description   text,
  is_active     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE companies (
  company_id        text PRIMARY KEY,
  display_name      text NOT NULL,
  official_site_url text,
  careers_url       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_clusters (
  cluster_id   text PRIMARY KEY,
  display_name text NOT NULL,
  definition   text NOT NULL,
  sort_order   integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_cluster_memberships (
  membership_id text PRIMARY KEY,
  company_id    text NOT NULL REFERENCES companies ON DELETE RESTRICT,
  cluster_id    text NOT NULL REFERENCES company_clusters ON DELETE RESTRICT,
  valid_from    date NOT NULL,
  valid_to      date,
  assigned_by   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_period CHECK (valid_to IS NULL OR valid_from <= valid_to),
  EXCLUDE USING gist (
    company_id WITH =,
    cluster_id WITH =,
    daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]') WITH &&
  )
);
CREATE INDEX idx_membership_company ON company_cluster_memberships (company_id, valid_from, valid_to);

CREATE TABLE periods (
  period_id   text PRIMARY KEY,
  label       text NOT NULL,
  starts_on   date NOT NULL,
  ends_on     date NOT NULL,
  is_baseline boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT period_range CHECK (starts_on <= ends_on)
);

CREATE TABLE dataset_versions (
  dataset_version text PRIMARY KEY,
  job_role_id     text REFERENCES job_roles ON DELETE RESTRICT,
  as_of_date      date NOT NULL,
  note            text,
  sealed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ 7. D3a 분류체계 (버전 축이 먼저 필요하다)
CREATE TABLE requirement_taxonomies (
  taxonomy_id text PRIMARY KEY,
  job_role_id text NOT NULL UNIQUE REFERENCES job_roles ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE requirement_taxonomy_versions (
  taxonomy_version_id     text PRIMARY KEY,
  taxonomy_id             text NOT NULL REFERENCES requirement_taxonomies ON DELETE RESTRICT,
  version_number          integer NOT NULL,
  taxonomy_policy_version text NOT NULL,
  published_at            timestamptz,
  superseded_at           timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxonomy_id, version_number)
);
CREATE UNIQUE INDEX idx_active_taxonomy_version ON requirement_taxonomy_versions (taxonomy_id)
  WHERE published_at IS NOT NULL AND superseded_at IS NULL;

CREATE TABLE knowledge_versions (
  knowledge_version   text PRIMARY KEY,
  job_role_id         text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  taxonomy_version_id text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ 10.1~10.3 지표 정책
CREATE TABLE metric_templates (
  metric_family   text NOT NULL,
  formula_version text NOT NULL,
  input_arity     text NOT NULL CHECK (input_arity IN ('scope_only','one_dimension','two_dimensions','dimension_cluster')),
  output_unit     text NOT NULL CHECK (output_unit IN ('ratio','count','distribution','difference')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric_family, formula_version)
);

CREATE TABLE metric_template_parameters (
  metric_family   text NOT NULL,
  formula_version text NOT NULL,
  parameter_name  text NOT NULL,
  parameter_type  text NOT NULL,
  required        boolean NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (metric_family, formula_version, parameter_name),
  FOREIGN KEY (metric_family, formula_version) REFERENCES metric_templates ON DELETE RESTRICT
);

CREATE TABLE metric_policy_versions (
  metric_policy_version text PRIMARY KEY,
  metric_family         text NOT NULL,
  formula_version       text NOT NULL,
  minimum_n             integer NOT NULL,
  minimum_n_comparison  integer NOT NULL,
  suppression_policy    text NOT NULL CHECK (suppression_policy IN ('hide','label_low_confidence','label_not_comparable')),
  uncertainty_method    text NOT NULL CHECK (uncertainty_method IN ('wilson_95','none')),
  effective_from        timestamptz NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (metric_family, formula_version) REFERENCES metric_templates ON DELETE RESTRICT,
  CONSTRAINT policy_n_order CHECK (minimum_n <= minimum_n_comparison)
);

-- ============================================================ 11.1~11.2 분석 버전
CREATE TABLE analysis_versions (
  analysis_version         text PRIMARY KEY,
  job_role_id              text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  dataset_version          text NOT NULL REFERENCES dataset_versions ON DELETE RESTRICT,
  taxonomy_version_id      text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  knowledge_version        text REFERENCES knowledge_versions ON DELETE RESTRICT,
  model_version            text NOT NULL,
  prompt_version           text NOT NULL,
  retrieval_policy_version text NOT NULL,
  metric_policy_version    text NOT NULL REFERENCES metric_policy_versions ON DELETE RESTRICT,
  scope_spec               jsonb NOT NULL,
  status                   text NOT NULL CHECK (status IN ('draft','running','validating','gated','active','failed','superseded')),
  tokens                   integer,
  cost                     numeric(12,4),
  started_at               timestamptz,
  ended_at                 timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_analysis_versions_role_status ON analysis_versions (job_role_id, status);

CREATE TABLE active_analysis_versions (
  job_role_id      text PRIMARY KEY REFERENCES job_roles ON DELETE RESTRICT,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  activated_at     timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ 12. 실행 궤적 (다른 표가 참조한다)
CREATE TABLE agent_runs (
  agent_run_id     text PRIMARY KEY,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  agent_name       text NOT NULL,
  objective_id     text,
  iteration        integer NOT NULL,
  stop_reason      text CHECK (stop_reason IN ('slots_filled','no_new_evidence','frontier_exhausted','budget_exhausted','repair_limit','no_progress','explicit_failure')),
  tokens           integer,
  cost             numeric(12,4),
  started_at       timestamptz,
  ended_at         timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_run_steps (
  step_id        text PRIMARY KEY,
  agent_run_id   text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  step_name      text NOT NULL,
  autonomy_level text CHECK (autonomy_level IN ('A0','A1','A2','A3')),
  started_at     timestamptz,
  ended_at       timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tool_calls (
  call_id      text PRIMARY KEY,
  agent_run_id text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  tool_name    text NOT NULL,
  arguments    jsonb,
  latency      integer,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_results (
  result_id        text PRIMARY KEY,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  target_type      text NOT NULL,
  target_id        text NOT NULL,
  check_name       text NOT NULL,
  autonomy_level   text CHECK (autonomy_level IN ('A0','A1')),
  verdict          text CHECK (verdict IN ('pass','fail','warn')),
  severity         text CHECK (severity IN ('blocking','warning','info')),
  reason_code      text,
  repair_action    text,
  judge_model      text,
  detail           jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_results_lookup ON verification_results (analysis_version, verdict, severity);

-- ============================================================ 4. D0 원본
CREATE TABLE sources (
  source_id     text PRIMARY KEY,
  source_type   text NOT NULL CHECK (source_type IN ('job_posting','company_official','public_standard','external_expert','learning_material')),
  url           text NOT NULL UNIQUE,
  publisher     text,
  author        text,
  robots_policy text,
  license_note  text,
  job_role_ids  text[] NOT NULL DEFAULT '{}',
  company_id    text REFERENCES companies ON DELETE RESTRICT,
  first_seen_at timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sources_job_roles ON sources USING gin (job_role_ids);

CREATE TABLE source_snapshots (
  snapshot_id            text PRIMARY KEY,
  source_id              text NOT NULL REFERENCES sources ON DELETE RESTRICT,
  content_hash           text NOT NULL,
  raw_content            text NOT NULL,
  published_at           timestamptz,
  fetched_at             timestamptz NOT NULL,
  dataset_version        text NOT NULL REFERENCES dataset_versions ON DELETE RESTRICT,
  supersedes_snapshot_id text REFERENCES source_snapshots ON DELETE RESTRICT,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, content_hash),
  CONSTRAINT content_hash_sha256 CHECK (char_length(content_hash) = 64)
);
CREATE INDEX idx_snapshots_dataset ON source_snapshots (dataset_version);
CREATE INDEX idx_snapshots_source_time ON source_snapshots (source_id, fetched_at DESC);

CREATE TABLE source_observations (
  observation_id text PRIMARY KEY,
  snapshot_id    text NOT NULL REFERENCES source_snapshots ON DELETE RESTRICT,
  observed_at    timestamptz NOT NULL,
  fetch_status   text NOT NULL CHECK (fetch_status IN ('ok','not_found','forbidden','timeout','changed','parse_error')),
  canonical_url  text,
  http_status    integer,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_observations_snapshot ON source_observations (snapshot_id, observed_at DESC);

CREATE TABLE source_assessments (
  assessment_id       text PRIMARY KEY,
  snapshot_id         text NOT NULL REFERENCES source_snapshots ON DELETE RESTRICT,
  source_tier         text NOT NULL CHECK (source_tier IN ('A','B','C','D','E')),
  allowed_uses        text[] NOT NULL,
  reliability_score   numeric(6,5) CHECK (reliability_score BETWEEN 0 AND 1),
  assessment_version  text NOT NULL,
  assessed_at         timestamptz NOT NULL,
  assessed_by_run_id  text REFERENCES agent_runs ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, assessment_version),
  CONSTRAINT allowed_uses_known CHECK (
    allowed_uses <@ ARRAY[
      'statistics','interpretation_context','strategy','roadmap',
      'wiki_definition','wiki_why_required','wiki_depth_criteria','wiki_prerequisites',
      'wiki_common_misconceptions','wiki_interview_verification','wiki_learning_sequence'
    ]::text[]
  )
);
CREATE INDEX idx_assessments_uses ON source_assessments USING gin (allowed_uses);

CREATE TABLE postings (
  posting_id      text PRIMARY KEY,
  source_id       text NOT NULL REFERENCES sources ON DELETE RESTRICT,
  company_id      text NOT NULL REFERENCES companies ON DELETE RESTRICT,
  job_role_id     text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  first_posted_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_postings_role_company ON postings (job_role_id, company_id);

CREATE TABLE posting_versions (
  posting_version_id text PRIMARY KEY,
  posting_id         text NOT NULL REFERENCES postings ON DELETE RESTRICT,
  snapshot_id        text NOT NULL REFERENCES source_snapshots ON DELETE RESTRICT,
  title              text NOT NULL,
  career_label_raw   text,
  edu_label_raw      text,
  entry_label_raw    text,
  entry_label        text NOT NULL CHECK (entry_label IN ('entry','junior','entry_junior','experienced','unspecified')),
  posted_at          timestamptz,
  closed_at          timestamptz,
  dataset_version    text NOT NULL REFERENCES dataset_versions ON DELETE RESTRICT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (posting_id, snapshot_id),
  CONSTRAINT posting_period CHECK (closed_at IS NULL OR posted_at IS NULL OR posted_at <= closed_at)
);
CREATE INDEX idx_posting_versions_dataset ON posting_versions (dataset_version, posted_at);
CREATE INDEX idx_posting_versions_entry ON posting_versions (entry_label);

-- ============================================================ 5. D1 검색 표현
CREATE TABLE source_chunks (
  chunk_id        text PRIMARY KEY,
  snapshot_id     text NOT NULL REFERENCES source_snapshots ON DELETE RESTRICT,
  section         text,
  ordinal         integer NOT NULL,
  text            text NOT NULL,
  context         jsonb NOT NULL,
  embedding_text  text NOT NULL,
  tsv             tsvector GENERATED ALWAYS AS (to_tsvector('simple', embedding_text)) STORED,
  token_count     integer NOT NULL,
  dataset_version text NOT NULL REFERENCES dataset_versions ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, ordinal)
);
CREATE INDEX idx_chunks_tsv ON source_chunks USING gin (tsv);
CREATE INDEX idx_chunks_dataset ON source_chunks (dataset_version);
CREATE INDEX idx_chunks_context ON source_chunks USING gin (context jsonb_path_ops);

CREATE TABLE chunk_embeddings (
  chunk_id            text NOT NULL REFERENCES source_chunks ON DELETE RESTRICT,
  embedding_model     text NOT NULL,
  embedding_dimension integer NOT NULL,
  embedding           vector(1536) NOT NULL,
  embedding_version   text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_id, embedding_version)
);
CREATE INDEX idx_chunk_embeddings_hnsw ON chunk_embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================ 6. D2 mention
CREATE TABLE requirement_mentions (
  mention_id           text PRIMARY KEY,
  posting_version_id   text NOT NULL REFERENCES posting_versions ON DELETE RESTRICT,
  snapshot_id          text NOT NULL REFERENCES source_snapshots ON DELETE RESTRICT,
  chunk_id             text NOT NULL REFERENCES source_chunks ON DELETE RESTRICT,
  raw_expression       text NOT NULL,
  evidence_span_start  integer NOT NULL CHECK (evidence_span_start >= 0),
  evidence_span_end    integer NOT NULL,
  stated_requiredness  text NOT NULL,
  section              text,
  extraction_confidence numeric(6,5) CHECK (extraction_confidence BETWEEN 0 AND 1),
  extraction_run_id    text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  dataset_version      text NOT NULL REFERENCES dataset_versions ON DELETE RESTRICT,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT span_order CHECK (evidence_span_start < evidence_span_end)
);
CREATE INDEX idx_mentions_posting ON requirement_mentions (posting_version_id);
CREATE INDEX idx_mentions_chunk ON requirement_mentions (chunk_id);
CREATE INDEX idx_mentions_dataset ON requirement_mentions (dataset_version);

-- ============================================================ 7.3~7.13 차원과 할당
CREATE TABLE standards (
  standard_id   text PRIMARY KEY,
  standard_body text NOT NULL,
  code          text NOT NULL,
  title         text NOT NULL,
  description   text,
  source_id     text REFERENCES sources ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (standard_body, code)
);

CREATE TABLE requirement_dimensions (
  dimension_id   text PRIMARY KEY,
  taxonomy_id    text NOT NULL REFERENCES requirement_taxonomies ON DELETE RESTRICT,
  dimension_kind text NOT NULL CHECK (dimension_kind IN ('technology','practice','domain','collaboration','tooling')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE requirement_dimension_versions (
  dimension_version_id     text PRIMARY KEY,
  dimension_id             text NOT NULL REFERENCES requirement_dimensions ON DELETE RESTRICT,
  taxonomy_version_id      text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  internal_canonical_label text NOT NULL,
  display_label            text NOT NULL,
  definition               text NOT NULL,
  lifecycle_status         text NOT NULL CHECK (lifecycle_status IN ('proposed','collecting_evidence','under_review','approved','active','merged','split','deprecated')),
  standard_mapping_status  text NOT NULL CHECK (standard_mapping_status IN ('exact','broader','narrower','related','unmapped')),
  standard_id              text REFERENCES standards ON DELETE RESTRICT,
  mapping_confidence       numeric(6,5),
  mapping_evidence         jsonb,
  review_status            text NOT NULL,
  role_boundary_eligible   boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dimension_id, taxonomy_version_id),
  CONSTRAINT mapping_requires_standard CHECK (standard_mapping_status = 'unmapped' OR standard_id IS NOT NULL)
);
CREATE INDEX idx_dimension_versions_lifecycle ON requirement_dimension_versions (taxonomy_version_id, lifecycle_status);

CREATE TABLE requirement_aliases (
  alias_id            text PRIMARY KEY,
  dimension_id        text NOT NULL REFERENCES requirement_dimensions ON DELETE RESTRICT,
  taxonomy_version_id text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  alias_text          text NOT NULL,
  alias_source        text NOT NULL CHECK (alias_source IN ('discovered','manual','standard')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxonomy_version_id, alias_text)
);

CREATE TABLE requirement_dimension_relations (
  relation_id         text PRIMARY KEY,
  taxonomy_version_id text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  src_dimension_id    text NOT NULL REFERENCES requirement_dimensions ON DELETE RESTRICT,
  dst_dimension_id    text NOT NULL REFERENCES requirement_dimensions ON DELETE RESTRICT,
  relation_type       text NOT NULL CHECK (relation_type IN ('broader','narrower','related')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (taxonomy_version_id, src_dimension_id, dst_dimension_id, relation_type),
  CONSTRAINT relation_not_self CHECK (src_dimension_id <> dst_dimension_id)
);

CREATE TABLE requirement_candidates (
  candidate_id         text PRIMARY KEY,
  taxonomy_id          text NOT NULL REFERENCES requirement_taxonomies ON DELETE RESTRICT,
  proposed_label       text NOT NULL,
  lifecycle_status     text NOT NULL CHECK (lifecycle_status IN ('proposed','collecting_evidence','under_review','approved','active','merged','split','deprecated')),
  nearest_dimension_id text REFERENCES requirement_dimensions ON DELETE RESTRICT,
  relation_judgment    text CHECK (relation_judgment IN ('synonym','broader','narrower','related','none')),
  discovered_in_run_id text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE requirement_candidate_mentions (
  candidate_id text NOT NULL REFERENCES requirement_candidates ON DELETE RESTRICT,
  mention_id   text NOT NULL REFERENCES requirement_mentions ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, mention_id)
);

CREATE TABLE requirement_candidate_decisions (
  decision_id               text PRIMARY KEY,
  candidate_id              text NOT NULL REFERENCES requirement_candidates ON DELETE RESTRICT,
  decision                  text NOT NULL CHECK (decision IN ('promote','hold','reject','merge')),
  independent_posting_count integer NOT NULL,
  independent_company_count integer NOT NULL,
  representative_sentences  jsonb NOT NULL,
  distance_to_existing      numeric(6,5),
  standard_mapping_status   text,
  relation_judgment         text,
  eval_set_comparison       jsonb,
  verification_result_id    text REFERENCES verification_results ON DELETE RESTRICT,
  decided_by                text NOT NULL,
  taxonomy_policy_version   text NOT NULL,
  promoted_to_version_id    text REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  created_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promote_needs_version CHECK (decision <> 'promote' OR promoted_to_version_id IS NOT NULL)
);

CREATE TABLE capabilities (
  capability_id   text PRIMARY KEY,
  job_role_id     text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  canonical_label text NOT NULL,
  definition      text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_role_id, canonical_label)
);

CREATE TABLE capability_dimension_links (
  capability_id       text NOT NULL REFERENCES capabilities ON DELETE RESTRICT,
  dimension_id        text NOT NULL REFERENCES requirement_dimensions ON DELETE RESTRICT,
  taxonomy_version_id text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (capability_id, dimension_id, taxonomy_version_id)
);

CREATE TABLE posting_requirement_assignments (
  assignment_id         text PRIMARY KEY,
  mention_id            text NOT NULL REFERENCES requirement_mentions ON DELETE RESTRICT,
  taxonomy_version_id   text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  dimension_id          text NOT NULL REFERENCES requirement_dimensions ON DELETE RESTRICT,
  normalized_label      text NOT NULL,
  requiredness          text NOT NULL CHECK (requiredness IN ('required','preferred','responsibility','unknown')),
  depth_level           text NOT NULL CHECK (depth_level IN ('foundation','application','tradeoff')),
  assignment_confidence numeric(6,5) CHECK (assignment_confidence BETWEEN 0 AND 1),
  assignment_method     text NOT NULL CHECK (assignment_method IN ('alias_exact','vector_match','model_judgment','manual')),
  verifier_status       text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mention_id, taxonomy_version_id)
);
CREATE INDEX idx_assignments_dimension ON posting_requirement_assignments (taxonomy_version_id, dimension_id);

-- ============================================================ 8. D3a 지식 그래프
CREATE TABLE ontology_versions (
  ontology_version                 text NOT NULL,
  graph_layer                      text NOT NULL CHECK (graph_layer IN ('semantic','provenance')),
  node_types                       jsonb NOT NULL,
  edge_types                       jsonb NOT NULL,
  allowed_connections              jsonb NOT NULL,
  required_evidence_by_edge_type   jsonb NOT NULL,
  effective_from                   timestamptz NOT NULL,
  created_at                       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ontology_version, graph_layer)
);

CREATE TABLE knowledge_nodes (
  node_id             text PRIMARY KEY,
  graph_layer         text NOT NULL CHECK (graph_layer IN ('semantic','provenance')),
  node_type           text NOT NULL,
  ref_table           text NOT NULL,
  ref_id              text NOT NULL,
  label               text NOT NULL,
  ontology_version    text NOT NULL,
  dataset_version     text REFERENCES dataset_versions ON DELETE RESTRICT,
  taxonomy_version_id text REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  analysis_version    text REFERENCES analysis_versions ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (ontology_version, graph_layer) REFERENCES ontology_versions ON DELETE RESTRICT,
  UNIQUE (graph_layer, node_type, ref_table, ref_id, ontology_version)
);
CREATE INDEX idx_nodes_ref ON knowledge_nodes (ref_table, ref_id);
CREATE INDEX idx_nodes_layer_type ON knowledge_nodes (graph_layer, node_type);

CREATE TABLE knowledge_edges (
  edge_id             text PRIMARY KEY,
  graph_layer         text NOT NULL CHECK (graph_layer IN ('semantic','provenance')),
  edge_type           text NOT NULL,
  src_node_id         text NOT NULL REFERENCES knowledge_nodes ON DELETE RESTRICT,
  dst_node_id         text NOT NULL REFERENCES knowledge_nodes ON DELETE RESTRICT,
  weight              numeric(6,5),
  evidence_id         text,
  produced_by_run_id  text REFERENCES agent_runs ON DELETE RESTRICT,
  verification_status text NOT NULL,
  ontology_version    text NOT NULL,
  dataset_version     text REFERENCES dataset_versions ON DELETE RESTRICT,
  taxonomy_version_id text REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  analysis_version    text REFERENCES analysis_versions ON DELETE RESTRICT,
  valid_from          timestamptz,
  valid_to            timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (ontology_version, graph_layer) REFERENCES ontology_versions ON DELETE RESTRICT,
  CONSTRAINT edge_not_self CHECK (src_node_id <> dst_node_id OR edge_type = 'PREREQUISITE_OF'),
  CONSTRAINT edge_period CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_from <= valid_to)
);
CREATE INDEX idx_edges_src ON knowledge_edges (src_node_id, edge_type);
CREATE INDEX idx_edges_dst ON knowledge_edges (dst_node_id, edge_type);
CREATE INDEX idx_edges_layer_analysis ON knowledge_edges (graph_layer, analysis_version);

CREATE TABLE graph_paths (
  path_id              text PRIMARY KEY,
  path_type            text NOT NULL,
  node_sequence        text[] NOT NULL,
  edge_sequence        text[] NOT NULL,
  taxonomy_version_id  text REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  knowledge_version    text REFERENCES knowledge_versions ON DELETE RESTRICT,
  analysis_version     text REFERENCES analysis_versions ON DELETE RESTRICT,
  graph_policy_version text NOT NULL,
  computed_at          timestamptz NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT path_lengths CHECK (array_length(edge_sequence, 1) = array_length(node_sequence, 1) - 1)
);
CREATE INDEX idx_graph_paths_cache_key ON graph_paths
  (path_type, taxonomy_version_id, knowledge_version, analysis_version, graph_policy_version);

-- ============================================================ 9. D3b Wiki
CREATE TABLE wiki_pages (
  page_id           text PRIMARY KEY,
  capability_id     text NOT NULL REFERENCES capabilities ON DELETE RESTRICT,
  knowledge_version text NOT NULL REFERENCES knowledge_versions ON DELETE RESTRICT,
  status            text NOT NULL CHECK (status IN ('draft','published','superseded')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capability_id, knowledge_version)
);

CREATE TABLE wiki_revisions (
  revision_id             text PRIMARY KEY,
  page_id                 text NOT NULL REFERENCES wiki_pages ON DELETE RESTRICT,
  definition              text,
  why_required            text,
  depth_criteria          jsonb,
  prerequisites           jsonb,
  common_misconceptions   jsonb,
  interview_verification  jsonb,
  learning_sequence       jsonb,
  produced_by_run_id      text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wiki_evidence (
  revision_id text NOT NULL REFERENCES wiki_revisions ON DELETE RESTRICT,
  field_name  text NOT NULL CHECK (field_name IN ('definition','why_required','depth_criteria','prerequisites','common_misconceptions','interview_verification','learning_sequence')),
  chunk_id    text NOT NULL REFERENCES source_chunks ON DELETE RESTRICT,
  source_tier text NOT NULL CHECK (source_tier IN ('A','B','C','D')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (revision_id, field_name, chunk_id)
);

-- ============================================================ 10.4~10.7 통계
CREATE TABLE dimension_metric_applicability (
  taxonomy_version_id text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  dimension_id        text NOT NULL REFERENCES requirement_dimensions ON DELETE RESTRICT,
  metric_family       text NOT NULL,
  applicable          boolean NOT NULL,
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (taxonomy_version_id, dimension_id, metric_family)
);

CREATE TABLE statistics_facts (
  fact_id                 text PRIMARY KEY,
  analysis_version        text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  metric_family           text NOT NULL,
  metric_policy_version   text NOT NULL REFERENCES metric_policy_versions ON DELETE RESTRICT,
  scope_level             text NOT NULL CHECK (scope_level IN ('overall','cluster','posting')),
  scope_id                text NOT NULL,
  period_id               text NOT NULL REFERENCES periods ON DELETE RESTRICT,
  dimension_id            text REFERENCES requirement_dimensions ON DELETE RESTRICT,
  secondary_dimension_id  text REFERENCES requirement_dimensions ON DELETE RESTRICT,
  measure                 text NOT NULL,
  numerator               integer,
  denominator             integer,
  value                   numeric(12,6),
  sample_size             integer NOT NULL,
  sample_status           text NOT NULL CHECK (sample_status IN ('not_computable','low_confidence','not_comparable','analysis_ready')),
  uncertainty             jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT denominator_nonneg CHECK (denominator IS NULL OR denominator >= 0),
  CONSTRAINT numerator_within CHECK (numerator IS NULL OR denominator IS NULL OR numerator <= denominator),
  CONSTRAINT not_computable_has_no_value CHECK (sample_status <> 'not_computable' OR value IS NULL)
);
CREATE UNIQUE INDEX idx_statistics_facts_unique ON statistics_facts (
  analysis_version, metric_family, measure, scope_level, scope_id, period_id,
  COALESCE(dimension_id, ''), COALESCE(secondary_dimension_id, '')
);
CREATE INDEX idx_statistics_facts_lookup ON statistics_facts
  (analysis_version, scope_level, scope_id, period_id, metric_family);
CREATE INDEX idx_statistics_facts_dimension ON statistics_facts (dimension_id);

CREATE TABLE capability_depth_profiles (
  profile_id          text PRIMARY KEY,
  capability_id       text NOT NULL REFERENCES capabilities ON DELETE RESTRICT,
  taxonomy_version_id text NOT NULL REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  scope_level         text NOT NULL CHECK (scope_level IN ('overall','cluster','posting')),
  scope_id            text NOT NULL,
  period_id           text NOT NULL REFERENCES periods ON DELETE RESTRICT,
  depth_distribution  jsonb NOT NULL,
  expected_depth      text NOT NULL CHECK (expected_depth IN ('foundation','application','tradeoff')),
  sample_size         integer NOT NULL,
  evidence_support    jsonb,
  confidence          numeric(6,5),
  analysis_version    text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_version, capability_id, scope_level, scope_id, period_id)
);

CREATE TABLE saturation_observations (
  observation_id             text PRIMARY KEY,
  analysis_version           text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  job_role_id                text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  scope_id                   text NOT NULL,
  posting_count              integer NOT NULL,
  new_candidate_count        integer NOT NULL,
  cumulative_dimension_count integer NOT NULL,
  marginal_gain              numeric(12,6),
  observed_at                timestamptz NOT NULL,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ 11.3~11.7 분석 산출물
CREATE TABLE analysis_outputs (
  output_id           text PRIMARY KEY,
  analysis_version    text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  job_role_id         text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  scope_level         text NOT NULL CHECK (scope_level IN ('overall','cluster','posting')),
  scope_id            text NOT NULL,
  output_type         text NOT NULL CHECK (output_type IN ('statistics','interpretation','strategy','roadmap')),
  payload             jsonb NOT NULL,
  produced_by_agent   text NOT NULL,
  verification_status text NOT NULL,
  generated_at        timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_version, scope_level, scope_id, output_type),
  CONSTRAINT output_producer_match CHECK (
    (output_type = 'interpretation' AND produced_by_agent = 'interpretation')
    OR (output_type = 'strategy' AND produced_by_agent = 'strategy')
    OR (output_type = 'roadmap' AND produced_by_agent = 'roadmap')
    OR (output_type = 'statistics' AND produced_by_agent = 'aggregation')
  )
);

CREATE TABLE analysis_claims (
  claim_id              text PRIMARY KEY,
  analysis_version      text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  output_id             text NOT NULL REFERENCES analysis_outputs ON DELETE RESTRICT,
  claim_type            text NOT NULL CHECK (claim_type IN ('posting_explicit','statistic','cluster_generalization','inferred_requirement','company_context_signal','strategy','no_deviation')),
  requirement_kind      text CHECK (requirement_kind IN ('explicit_requirement','inferred_requirement','company_context_signal')),
  scope_level           text NOT NULL,
  scope_id              text NOT NULL,
  claim_text            text NOT NULL,
  structured_slots      jsonb NOT NULL,
  confidence            numeric(6,5),
  confidence_components jsonb NOT NULL,
  verification_status   text NOT NULL CHECK (verification_status IN ('verified','verified_with_warning','insufficient_evidence','contradicted','policy_violation','schema_invalid','needs_research')),
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_claims_scope ON analysis_claims (analysis_version, scope_level, scope_id);
CREATE INDEX idx_claims_output ON analysis_claims (output_id);

CREATE TABLE analysis_claim_evidence (
  claim_id     text NOT NULL REFERENCES analysis_claims ON DELETE RESTRICT,
  support_type text NOT NULL CHECK (support_type IN ('chunk','statistic_fact','graph_path','wiki_revision')),
  support_id   text NOT NULL,
  relation     text NOT NULL CHECK (relation IN ('supports','contradicts')),
  weight       numeric(6,5),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, support_type, support_id, relation)
);
CREATE INDEX idx_claim_evidence_support ON analysis_claim_evidence (support_type, support_id);

CREATE TABLE coverage_assertions (
  assertion_id      text PRIMARY KEY,
  analysis_version  text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  scope_level       text NOT NULL,
  scope_id          text NOT NULL,
  dimension_id      text REFERENCES requirement_dimensions ON DELETE RESTRICT,
  population_n      integer NOT NULL,
  checked_n         integer NOT NULL,
  matched_n         integer NOT NULL,
  assertion         text NOT NULL,
  coverage_complete boolean NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coverage_counts CHECK (checked_n <= population_n AND matched_n <= checked_n),
  CONSTRAINT coverage_flag_derived CHECK (coverage_complete = (checked_n = population_n))
);

CREATE TABLE checklist_concepts (
  concept_id      text PRIMARY KEY,
  job_role_id     text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  canonical_title text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('project','story','study')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_role_id, canonical_title)
);

CREATE TABLE checklist_items (
  item_id          text PRIMARY KEY,
  concept_id       text NOT NULL REFERENCES checklist_concepts ON DELETE RESTRICT,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  scope_level      text NOT NULL,
  scope_id         text NOT NULL,
  title            text NOT NULL,
  subtitle         text,
  reason           text NOT NULL,
  evidence_needed  text NOT NULL,
  channels         text[] NOT NULL,
  required         boolean NOT NULL,
  is_deviation     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_version, scope_level, scope_id, concept_id),
  CONSTRAINT channels_known CHECK (channels <@ ARRAY['essay','portfolio','interview']::text[])
);

CREATE TABLE checklist_item_mappings (
  from_item_id     text NOT NULL REFERENCES checklist_items ON DELETE RESTRICT,
  to_item_id       text NOT NULL REFERENCES checklist_items ON DELETE RESTRICT,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  relation         text NOT NULL CHECK (relation IN ('split_into','merged_from','renamed_to')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_item_id, to_item_id, relation)
);

CREATE TABLE roadmap_items (
  roadmap_item_id  text PRIMARY KEY,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  scope_level      text NOT NULL,
  scope_id         text NOT NULL,
  step_order       integer NOT NULL,
  phase_label      text,
  weeks            integer,
  priority         text CHECK (priority IN ('vhigh','high','mid')),
  title            text NOT NULL,
  body             text,
  deliverable      text,
  reason           text,
  tags             text[],
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_version, scope_level, scope_id, step_order)
);

CREATE TABLE roadmap_item_fills (
  roadmap_item_id text NOT NULL REFERENCES roadmap_items ON DELETE RESTRICT,
  concept_id      text NOT NULL REFERENCES checklist_concepts ON DELETE RESTRICT,
  fill_kind       text NOT NULL CHECK (fill_kind IN ('dev','normal','study')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (roadmap_item_id, concept_id)
);

CREATE TABLE study_tracks (
  track_id         text PRIMARY KEY,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  scope_level      text NOT NULL,
  scope_id         text NOT NULL,
  capability_id    text NOT NULL REFERENCES capabilities ON DELETE RESTRICT,
  phase_label      text,
  priority         text CHECK (priority IN ('vhigh','high','mid','track')),
  depth_reference  text CHECK (depth_reference IN ('foundation','application','tradeoff')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_version, scope_level, scope_id, capability_id)
);

-- ============================================================ 12. 검색 계측
CREATE TABLE retrieval_runs (
  retrieval_run_id text PRIMARY KEY,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  agent_name       text NOT NULL,
  agent_run_id     text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  started_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE retrieval_queries (
  query_id         text PRIMARY KEY,
  retrieval_run_id text NOT NULL REFERENCES retrieval_runs ON DELETE RESTRICT,
  subquery_type    text NOT NULL,
  query_text       text NOT NULL,
  strategy         text NOT NULL CHECK (strategy IN ('keyword','vector','graph','sql')),
  filters          jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE retrieval_candidates (
  candidate_id     text PRIMARY KEY,
  query_id         text NOT NULL REFERENCES retrieval_queries ON DELETE RESTRICT,
  target_type      text NOT NULL CHECK (target_type IN ('chunk','statistic_fact','graph_path','wiki_revision')),
  target_id        text NOT NULL,
  strategy         text NOT NULL,
  strategy_rank    integer NOT NULL,
  lexical_score    numeric(12,6),
  vector_score     numeric(12,6),
  graph_score      numeric(12,6),
  fusion_score     numeric(12,6),
  rerank_score     numeric(12,6),
  selected         boolean NOT NULL,
  rejection_reason text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidates_fusion ON retrieval_candidates (query_id, fusion_score DESC);

CREATE TABLE evidence_sets (
  evidence_set_id             text PRIMARY KEY,
  retrieval_run_id            text NOT NULL REFERENCES retrieval_runs ON DELETE RESTRICT,
  objective_id                text NOT NULL,
  optimization_policy_version text NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evidence_set_members (
  evidence_set_id text NOT NULL REFERENCES evidence_sets ON DELETE RESTRICT,
  candidate_id    text NOT NULL REFERENCES retrieval_candidates ON DELETE RESTRICT,
  slot_name       text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evidence_set_id, candidate_id)
);

CREATE TABLE evidence_usages (
  usage_id      text PRIMARY KEY,
  candidate_id  text NOT NULL REFERENCES retrieval_candidates ON DELETE RESTRICT,
  used_claim_id text REFERENCES analysis_claims ON DELETE RESTRICT,
  usage_type    text NOT NULL CHECK (usage_type IN ('supports_claim','contradicts_claim','verification_only','normalization','planning','coverage_check','unused')),
  recorded_at   timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT citation_needs_claim CHECK (
    usage_type NOT IN ('supports_claim','contradicts_claim') OR used_claim_id IS NOT NULL
  )
);

CREATE TABLE research_requests (
  request_id                text PRIMARY KEY,
  requested_by_run_id       text REFERENCES agent_runs ON DELETE RESTRICT,
  analysis_version          text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  goal                      text NOT NULL,
  needed_evidence_type      text NOT NULL,
  scope_level               text NOT NULL,
  scope_id                  text,
  status                    text NOT NULL CHECK (status IN ('open','scheduled','fulfilled','rejected','expired')),
  priority                  integer NOT NULL,
  fulfilled_by_snapshot_ids text[],
  resolved_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_research_requests_queue ON research_requests (status, priority DESC);

CREATE TABLE repair_orders (
  order_id         text PRIMARY KEY,
  agent_run_id     text NOT NULL REFERENCES agent_runs ON DELETE RESTRICT,
  target_claim_id  text REFERENCES analysis_claims ON DELETE RESTRICT,
  failed_check     text NOT NULL,
  reason           text NOT NULL,
  action           text NOT NULL CHECK (action IN ('requery','add_counterevidence','swap_evidence','drop_claim','narrow_scope','lower_confidence','recompute_stat','fix_identifier')),
  missing_evidence jsonb,
  requery_hint     text,
  round            integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ 13. 평가
CREATE TABLE evaluation_sets (
  eval_set_id text PRIMARY KEY,
  job_role_id text NOT NULL REFERENCES job_roles ON DELETE RESTRICT,
  source_file text NOT NULL,
  loaded_at   timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_cases (
  case_id     text PRIMARY KEY,
  eval_set_id text NOT NULL REFERENCES evaluation_sets ON DELETE RESTRICT,
  posting_id  text REFERENCES postings ON DELETE RESTRICT,
  case_type   text NOT NULL CHECK (case_type IN ('mention_extraction','dimension_assignment','interpretation','strategy_linkage','coverage')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_expected_items (
  expected_id    text PRIMARY KEY,
  case_id        text NOT NULL REFERENCES evaluation_cases ON DELETE RESTRICT,
  expected_field text NOT NULL,
  expected_value jsonb NOT NULL,
  rubric         text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_runs (
  eval_run_id      text PRIMARY KEY,
  eval_set_id      text NOT NULL REFERENCES evaluation_sets ON DELETE RESTRICT,
  analysis_version text NOT NULL REFERENCES analysis_versions ON DELETE RESTRICT,
  started_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE evaluation_metrics (
  eval_run_id text NOT NULL REFERENCES evaluation_runs ON DELETE RESTRICT,
  metric_name text NOT NULL,
  value       numeric(12,6) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (eval_run_id, metric_name)
);

CREATE TABLE evaluation_failures (
  failure_id     text PRIMARY KEY,
  eval_run_id    text NOT NULL REFERENCES evaluation_runs ON DELETE RESTRICT,
  case_id        text NOT NULL REFERENCES evaluation_cases ON DELETE RESTRICT,
  expected_id    text REFERENCES evaluation_expected_items ON DELETE RESTRICT,
  observed_value jsonb,
  reason         text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ 14. 원본 불변성
CREATE FUNCTION block_append_only_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_snapshots_append_only
  BEFORE UPDATE OR DELETE ON source_snapshots
  FOR EACH ROW EXECUTE FUNCTION block_append_only_mutation();

CREATE TRIGGER trg_observations_append_only
  BEFORE UPDATE OR DELETE ON source_observations
  FOR EACH ROW EXECUTE FUNCTION block_append_only_mutation();
