# CareerSignal 온톨로지 v1

## 1. 문서 목적

이 문서는 지식 그래프에 등록하는 노드·엣지 유형, 허용 연결, 엣지별 필수 근거를 정의한다. `ontology_versions` 행의 내용이 이 정의다.

등록되지 않은 유형과 허용되지 않은 연결은 검증에서 폐기하고 기록을 남긴다. 그래프 층의 의미와 생성 주체는 [지식·저장 구조](knowledge-schema.md) 7장, 테이블 정의는 [ERD](erd.md) 8장에 있다.

`ontology_version`은 `graph_layer`와 함께 복합 기본키를 이룬다. 두 층은 독립적으로 버전을 올린다.

## 2. semantic 층

### 2.1 노드 유형

| 유형 | `ref_table` | 생성 시점 |
| --- | --- | --- |
| `JobRole` | `job_roles` | D3a |
| `Posting` | `postings` | D3a |
| `Company` | `companies` | D3a |
| `CompanyCluster` | `company_clusters` | D3a |
| `RequirementDimension` | `requirement_dimensions` | D3a |
| `Capability` | `capabilities` | D3a |
| `Technology` | `requirement_dimensions` 중 `dimension_kind = 'technology'` | D3a |
| `Standard` | `standards` | D3a |
| `ProofArtifact` | `checklist_items` 중 `kind = 'project'` | D5 이후 |
| `Channel` | 고정 목록 `essay`·`portfolio`·`interview` | D5 이후 |
| `LearningResource` | `study_tracks` | D5 이후 |
| `Project` | `roadmap_items` | D5 이후 |

`Technology`는 `RequirementDimension`의 부분집합이다. 같은 `ref_id`가 두 노드 유형으로 나타나지 않도록, `dimension_kind`가 `technology`인 차원은 `Technology` 노드만 만든다.

### 2.2 엣지 유형과 허용 연결

| 엣지 | 출발 | 도착 | 생성 | `taxonomy_version_id` |
| --- | --- | --- | --- | --- |
| `POSTED_BY` | `Posting` | `Company` | D3a | 없음 |
| `BELONGS_TO_CLUSTER` | `Company` | `CompanyCluster` | D3a | 없음 |
| `REQUIRES` | `Posting` | `RequirementDimension`, `Technology` | D3a | 필수 |
| `REQUIRES_CAPABILITY` | `RequirementDimension`, `Technology` | `Capability` | D3a | 필수 |
| `MAPS_TO_STANDARD` | `Capability` | `Standard` | D3a | 없음 |
| `PREREQUISITE_OF` | `Capability` | `Capability` | D3a | 없음 |
| `PROVEN_BY` | `Capability` | `ProofArtifact` | D5 이후 | 없음 |
| `USED_IN_CHANNEL` | `ProofArtifact` | `Channel` | D5 이후 | 없음 |
| `TEACHES` | `LearningResource` | `Capability` | D5 이후 | 없음 |

위 표에 없는 출발·도착 조합은 허용하지 않는다.

`PREREQUISITE_OF`만 자기 참조 유형이 같은 엣지다. 순환은 준비 로드맵의 검증이 검사한다.

### 2.3 생성 시점 분리

`D3a` 엣지는 지식 구축 에이전트가 만들고 해석·전략·로드맵의 탐색 입력이 된다.

`D5 이후` 엣지는 계보 기록 파이프라인이 산출물 저장 직후에 만든다. 이를 생성한 에이전트의 같은 실행 안에서는 사용할 수 없다. 화면의 근거 경로 표시와 다음 분석 버전의 탐색에 사용한다.

## 3. provenance 층

### 3.1 노드 유형

| 유형 | `ref_table` |
| --- | --- |
| `SourceSnapshot` | `source_snapshots` |
| `Chunk` | `source_chunks` |
| `RequirementMention` | `requirement_mentions` |
| `Assignment` | `posting_requirement_assignments` |
| `StatisticFact` | `statistics_facts` |
| `AnalysisClaim` | `analysis_claims` |
| `ChecklistItem` | `checklist_items` |
| `RoadmapItem` | `roadmap_items` |
| `AnalysisOutput` | `analysis_outputs` |
| `AgentRun` | `agent_runs` |

### 3.2 엣지 유형과 허용 연결

| 엣지 | 출발 | 도착 | `taxonomy_version_id` |
| --- | --- | --- | --- |
| `PART_OF` | `Chunk` | `SourceSnapshot` | 없음 |
| `EVIDENCED_BY` | `RequirementMention` | `Chunk` | 없음 |
| `ASSIGNED_TO` | `RequirementMention` | `RequirementDimension`, `Technology` | 필수 |
| `COMPUTED_FROM` | `StatisticFact` | `Assignment` | 없음 |
| `SUPPORTED_BY` | `AnalysisClaim` | `Chunk`, `StatisticFact` | 없음 |
| `CONTRADICTED_BY` | `AnalysisClaim` | `Chunk` | 없음 |
| `DERIVED_FROM` | `ChecklistItem` | `AnalysisClaim` | 없음 |
| `FILLS` | `RoadmapItem` | `ChecklistItem` | 없음 |
| `PRODUCED_BY` | `AnalysisOutput` | `AgentRun` | 없음 |

`ASSIGNED_TO`는 semantic 층의 노드를 도착점으로 갖는 유일한 provenance 엣지다. 원문 표현에서 정규화된 차원으로 이어지는 계보이므로 두 층을 잇는다.

전 층이 계보 기록 파이프라인의 생성 대상이다.

## 4. 엣지별 필수 근거

`required_evidence_by_edge_type`이 엣지마다 `evidence_id`에 무엇이 들어가야 하는지 정의한다. 근거가 없는 엣지는 검증에서 폐기한다.

| 엣지 | 필수 근거 | `evidence_id`가 가리키는 것 |
| --- | --- | --- |
| `POSTED_BY` | 없음 | 외래키로 성립 |
| `BELONGS_TO_CLUSTER` | membership 행 | `company_cluster_memberships.membership_id` |
| `REQUIRES` | 할당 | `posting_requirement_assignments.assignment_id` |
| `REQUIRES_CAPABILITY` | 역량 연결 | `capability_dimension_links` 복합키 |
| `MAPS_TO_STANDARD` | 표준 연결 상태 | `requirement_dimension_versions.dimension_version_id` |
| `PREREQUISITE_OF` | Wiki 근거 또는 표준 | `wiki_evidence` 행 또는 `standards.standard_id` |
| `PROVEN_BY` | 체크리스트 항목 | `checklist_items.item_id` |
| `USED_IN_CHANNEL` | 체크리스트 항목의 `channels` | `checklist_items.item_id` |
| `TEACHES` | 학습 트랙 | `study_tracks.track_id` |
| `PART_OF` | 없음 | 외래키로 성립 |
| `EVIDENCED_BY` | 근거 위치 | `requirement_mentions.mention_id` |
| `ASSIGNED_TO` | 할당 | `posting_requirement_assignments.assignment_id` |
| `COMPUTED_FROM` | 없음 | 집계 입력으로 성립 |
| `SUPPORTED_BY` | 주장–근거 행 | `analysis_claim_evidence` 복합키 |
| `CONTRADICTED_BY` | 주장–근거 행 | `analysis_claim_evidence` 복합키 |
| `DERIVED_FROM` | 주장 | `analysis_claims.claim_id` |
| `FILLS` | 충족 연결 | `roadmap_item_fills` 복합키 |
| `PRODUCED_BY` | 없음 | 외래키로 성립 |

`PREREQUISITE_OF`만 Wiki 또는 공공 표준의 근거를 요구한다. 선수 관계는 관측이 아니라 판단이므로 근거 없이 생성하지 않는다.

## 5. 파생 관계

`BELONGS_TO_CLUSTER`, `REQUIRES`, `SUPPORTED_BY`, `CONTRADICTED_BY`, `DERIVED_FROM`, `FILLS`, `PROVEN_BY`, `USED_IN_CHANNEL`, `TEACHES`, `ASSIGNED_TO`는 관계형 테이블에서 빌드한 파생 표현이다.

진실의 원천은 근거 표의 정규 테이블이며 엣지는 경로 탐색을 위한 표현이다. 엣지에서 테이블로 향하는 역방향 갱신은 없다. 두 값이 어긋나면 검증에서 엣지를 폐기하고 다시 기록한다.

## 6. `weight`

`weight`는 nullable이다. 그래프는 D3a에서 구축하고 통계는 D4에서 계산하므로, 엣지가 만들어지는 시점에는 값이 없다.

| 엣지 | `weight`가 담는 값 |
| --- | --- |
| `REQUIRES` | 해당 범위의 `posting_prevalence` |
| `REQUIRES_CAPABILITY` | 연결된 차원들의 `posting_prevalence` 최댓값 |
| 그 외 | NULL |

`weight`가 비어 있는 동안 경로 탐색은 동작하고 순위만 정해지지 않는다. 집계 파이프라인이 D4 직후 채운다.

## 7. 검증

| 검사 | 내용 |
| --- | --- |
| 유형 등록 | `node_type`과 `edge_type`이 해당 층의 등록 목록에 있다 |
| 연결 허용 | 출발·도착 노드 유형 조합이 `allowed_connections`에 있다 |
| 근거 존재 | `required_evidence_by_edge_type`이 요구하는 `evidence_id`가 채워져 있다 |
| 근거 실재 | `evidence_id`가 가리키는 행이 존재한다 |
| 버전 일치 | 분류체계 의존 엣지가 실행 컨텍스트와 같은 `taxonomy_version_id`를 갖는다 |
| 파생 일치 | 파생 엣지가 원천 테이블의 행과 일치한다 |
| 층 경계 | semantic 노드를 도착점으로 갖는 provenance 엣지가 `ASSIGNED_TO`뿐이다 |

위반한 엣지는 폐기하고 `verification_results`에 사유를 남긴다.

## 8. 버전 변경

| 변경 | 조치 |
| --- | --- |
| 노드·엣지 유형 추가 | 새 `ontology_version` 발행. 기존 엣지 유지 |
| 유형 제거 | 새 버전 발행 후 해당 유형 엣지 재구축에서 제외 |
| 허용 연결 축소 | 새 버전 발행. 위반 엣지를 검증에서 폐기 |
| 필수 근거 강화 | 새 버전 발행. 근거 없는 엣지를 폐기 |

온톨로지 버전 발행은 해당 직무의 그래프 재구축을 요구한다. 재실행 범위는 [아키텍처](architecture.md) 7.1에 있다.

## 9. 관련 문서

- [지식·저장 구조](knowledge-schema.md)
- [ERD](erd.md)
- [에이전트 설계](agent-design.md)
- [아키텍처](architecture.md)
