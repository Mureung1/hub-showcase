# CareerSignal 권한 매트릭스

## 1. 문서 목적

이 문서는 구성요소별 읽기·쓰기 범위와 네 층의 강제 수단을 정의한다. P3의 데이터베이스 role과 repository 인터페이스가 이 정의를 구현하고, 통합 테스트가 위반을 검출한다.

구성요소의 책임과 자율성 등급은 [아키텍처](architecture.md) 4장, 테이블 정의는 [ERD](erd.md)에 있다.

## 2. 구성요소

| 구성요소 | 계층 | 자율성 | 데이터베이스 role |
| --- | --- | --- | --- |
| 오케스트레이터 | Control Plane | A0 | `cs_orchestrator` |
| 데이터 수집 에이전트 | Domain Agent | A3 | `cs_agent_collect` |
| 지식 구축 에이전트 | Domain Agent | A2 | `cs_agent_knowledge` |
| 통계 분석 에이전트 | Domain Agent | A2 | `cs_agent_stats` |
| 채용공고 해석 에이전트 | Domain Agent | A2 | `cs_agent_interpret` |
| 합격 전략 에이전트 | Domain Agent | A2 | `cs_agent_strategy` |
| 준비 로드맵 에이전트 | Domain Agent | A2 | `cs_agent_roadmap` |
| 적재 파이프라인 | Helper Pipeline | A0 | `cs_pipe_ingest` |
| 인덱싱 파이프라인 | Helper Pipeline | A0 | `cs_pipe_index` |
| 집계 파이프라인 | Helper Pipeline | A0 | `cs_pipe_aggregate` |
| 계보 기록 파이프라인 | Helper Pipeline | A0 | `cs_pipe_lineage` |
| 검증 파이프라인 | Helper Pipeline | A0 + A1 | `cs_pipe_verify` |
| 서빙 파이프라인 | Helper Pipeline | A0 | `cs_serving` |
| Express | 사용자 런타임 | A0 | `cs_serving` |

Express와 서빙 파이프라인은 같은 role을 쓴다. 둘 다 활성 버전 조회만 수행한다.

## 3. 쓰기 범위

| 구성요소 | 쓰기 가능 테이블 |
| --- | --- |
| 오케스트레이터 | `analysis_versions`, `active_analysis_versions`, `dataset_versions`, `knowledge_versions`, `research_requests`(상태 갱신) |
| 데이터 수집 | `sources`, `source_snapshots`(INSERT만), `source_observations`(INSERT만), `source_assessments` |
| 지식 구축 | `knowledge_nodes`·`knowledge_edges`의 사전 semantic 묶음, `capabilities`, `capability_dimension_links`, `wiki_pages`, `wiki_revisions`, `wiki_evidence` |
| 통계 분석 | `requirement_mentions`, `requirement_candidates`, `requirement_candidate_mentions`, `requirement_candidate_decisions`, `requirement_dimensions`, `requirement_dimension_versions`, `requirement_aliases`, `requirement_dimension_relations`, `requirement_taxonomy_versions`, `posting_requirement_assignments`, `saturation_observations`, `research_requests`(INSERT) |
| 채용공고 해석 | `analysis_claims`, `analysis_claim_evidence`, `coverage_assertions`, `analysis_outputs`, `research_requests`(INSERT) |
| 합격 전략 | `checklist_concepts`, `checklist_items`, `checklist_item_mappings`, `analysis_outputs`, `research_requests`(INSERT) |
| 준비 로드맵 | `roadmap_items`, `roadmap_item_fills`, `study_tracks`, `analysis_outputs`, `research_requests`(INSERT) |
| 적재 | `postings`, `posting_versions`, `source_snapshots`(INSERT만), `source_observations`(INSERT만) |
| 인덱싱 | `source_chunks`, `chunk_embeddings` |
| 집계 | `statistics_facts`, `capability_depth_profiles`, `knowledge_edges.weight`(UPDATE만) |
| 계보 기록 | `knowledge_nodes`·`knowledge_edges`의 Provenance 묶음과 사후 semantic 묶음, `graph_paths` |
| 검증 | `verification_results`, `repair_orders`, `research_requests`(INSERT) |
| 서빙·Express | 없음 |

기준 테이블 `job_roles`, `companies`, `company_clusters`, `company_cluster_memberships`, `periods`, `standards`와 정책 테이블 `metric_templates`, `metric_template_parameters`, `metric_policy_versions`, `ontology_versions`, `dimension_metric_applicability`는 운영자가 마이그레이션과 시드로 관리한다. 어떤 에이전트도 쓰지 않는다.

평가 테이블 `evaluation_*`는 평가 실행기가 쓴다. 분석 실행 경로에서 접근하지 않는다.

### 3.1 전 구성요소 공통

계측 테이블은 모든 실행 구성요소가 INSERT한다.

```text
retrieval_runs
retrieval_queries
retrieval_candidates
evidence_sets
evidence_set_members
evidence_usages
agent_runs
agent_run_steps
tool_calls
```

기록만 하고 갱신하지 않는다. `UPDATE`와 `DELETE`를 허용하지 않는다.

## 4. 읽기 범위

읽기는 쓰기보다 넓게 허용한다. 계보 추적과 검증이 상위 계층을 조회해야 하기 때문이다.

| 구성요소 | 읽기 가능 |
| --- | --- |
| 오케스트레이터 | 전 테이블 |
| 데이터 수집 | `sources`, `source_*`, `research_requests`, 기준 테이블 |
| 지식 구축 | D0~D4 전체, 기준 테이블, 정책 테이블 |
| 통계 분석 | D0~D2, 분류체계, 평가 세트, 기준 테이블 |
| 채용공고 해석 | D0~D4, 그래프, Wiki, 기준 테이블 |
| 합격 전략 | D0~D5의 해석 산출물, 그래프, Wiki, 기준 테이블 |
| 준비 로드맵 | D0~D5의 해석·전략 산출물, 그래프, Wiki, 기준 테이블 |
| 집계 | D3a 할당, 기준 테이블, 정책 테이블 |
| 계보 기록 | 전 산출물 테이블 |
| 검증 | 전 테이블 |
| 서빙·Express | `active_analysis_versions`가 가리키는 버전의 `analysis_outputs`, `statistics_facts`, `checklist_*`, `roadmap_*`, `study_tracks`, `graph_paths`, 기준 테이블 |

Express는 활성 버전이 아닌 산출물을 조회하지 않는다. 조회 함수가 `active_analysis_versions`와의 조인을 강제한다.

## 5. 테이블을 공유하는 구성요소

테이블 단위 `GRANT`로 분리하지 못하는 경우가 셋이다.

### 5.1 `analysis_outputs`

해석·전략·로드맵 세 에이전트와 집계 파이프라인이 쓴다.

`CHECK` 제약이 `output_type`과 `produced_by_agent`의 일치를 데이터베이스에서 강제한다. 정의는 [ERD](erd.md) 11.3에 있다. 각 role은 자기 `produced_by_agent` 값으로만 INSERT할 수 있고, 다른 값을 넣으면 제약 위반으로 실패한다.

### 5.2 `knowledge_nodes`·`knowledge_edges`

지식 구축 에이전트와 계보 기록 파이프라인이 쓴다.

`graph_layer`와 유형 목록으로 범위를 나눈다. 강제는 행 수준 정책으로 수행한다.

```sql
CREATE POLICY knowledge_pre_semantic ON knowledge_edges
  FOR INSERT TO cs_agent_knowledge
  WITH CHECK (
    graph_layer = 'semantic'
    AND edge_type IN ('POSTED_BY','BELONGS_TO_CLUSTER','REQUIRES',
                      'REQUIRES_CAPABILITY','MAPS_TO_STANDARD','PREREQUISITE_OF')
  );

CREATE POLICY knowledge_derived ON knowledge_edges
  FOR INSERT TO cs_pipe_lineage
  WITH CHECK (
    graph_layer = 'provenance'
    OR edge_type IN ('PROVEN_BY','USED_IN_CHANNEL','TEACHES')
  );
```

### 5.3 `research_requests`

네 에이전트와 검증 파이프라인이 INSERT하고 오케스트레이터가 상태를 갱신한다.

```sql
GRANT INSERT ON research_requests TO
  cs_agent_interpret, cs_agent_strategy, cs_agent_roadmap,
  cs_agent_stats, cs_pipe_verify;
GRANT UPDATE (status, priority, fulfilled_by_snapshot_ids, resolved_at)
  ON research_requests TO cs_orchestrator;
```

컬럼 단위 `GRANT`가 요청자는 상태를 바꾸지 못하게 한다.

## 6. 강제 수단 네 층

| 층 | 수단 | 검출 시점 |
| --- | --- | --- |
| 설계 | 3장과 4장의 범위 | 문서 검토 |
| 코드 | 구성요소별 repository 인터페이스 | 개발 |
| 데이터베이스 | role, `GRANT`, `CHECK`, 행 수준 정책, 트리거 | 실행 |
| 검증 | 허용 범위 밖 쓰기가 실패하는 통합 테스트 | CI |

### 6.1 코드 층

데이터베이스 접근은 `repositories/`만 수행한다. 다른 경로를 두지 않는다.

각 구성요소는 자기 repository 인터페이스만 주입받는다. 해석 에이전트에 `StatisticsFactRepository`의 쓰기 메서드가 주입되지 않으므로, 코드를 잘못 써도 호출할 대상이 없다.

`contracts/`와 `domain/`은 저장소와 모델을 import하지 않는다. 순수 개념이 저장 구조에 묶이지 않게 한다.

### 6.2 데이터베이스 층

Supabase의 service role은 행 수준 정책을 우회한다. 따라서 에이전트 서비스는 service role이 아니라 구성요소별 role로 접속한다. Express만 service role을 쓰고, Express는 쓰기 권한이 없다.

기본 권한을 회수하고 필요한 것만 부여한다.

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
```

append-only 테이블은 트리거로 `UPDATE`·`DELETE`를 차단한다. 권한과 별개로 동작해 role 설정이 잘못되어도 원본이 보존된다.

| 테이블 | 차단 |
| --- | --- |
| `source_snapshots` | `UPDATE`, `DELETE` |
| `source_observations` | `UPDATE`, `DELETE` |
| 계측 테이블 9종 | `UPDATE`, `DELETE` |

### 6.3 검증 층

통합 테스트가 구성요소마다 허용 범위 밖 쓰기를 시도하고 실패를 확인한다.

| 테스트 | 기대 |
| --- | --- |
| 해석 role이 `statistics_facts`에 INSERT | 권한 오류 |
| 통계 role이 `analysis_claims`에 INSERT | 권한 오류 |
| 전략 role이 `output_type = 'roadmap'`으로 INSERT | `CHECK` 위반 |
| 지식 구축 role이 `SUPPORTED_BY` 엣지 INSERT | 정책 위반 |
| 계보 기록 role이 `REQUIRES` 엣지 INSERT | 정책 위반 |
| 해석 role이 `research_requests.status` UPDATE | 권한 오류 |
| 임의 role이 `source_snapshots` UPDATE | 트리거 예외 |
| Express role이 아무 테이블에 INSERT | 권한 오류 |
| Express가 비활성 버전의 `analysis_outputs` 조회 | 빈 결과 |

이 테스트는 P3-4의 완료 조건이다.

## 7. 키 배치

| 서비스 | 보유 키 |
| --- | --- |
| `server/.env` | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AGENT_URL` |
| `agent/.env` | `SUPABASE_URL`, 구성요소별 role 접속 정보, `OPENAI_API_KEY`, `NVIDIA_API_KEY` |

Express는 생성 모델 키를 보유하지 않는다. 확장 시 `GEMINI_API_KEY`와 `YOUTUBE_API_KEY`도 `agent/.env`에만 둔다.

## 8. 관련 문서

- [아키텍처](architecture.md)
- [지식·저장 구조](knowledge-schema.md)
- [ERD](erd.md)
- [검증 체크리스트](checklist.md)
