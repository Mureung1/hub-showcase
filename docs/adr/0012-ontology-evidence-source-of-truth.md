# ADR 0012. 엣지별 필수 근거의 기준을 온톨로지 문서로 둔다

## 맥락

엣지별 필수 근거는 두 곳에 적혀 있다. [온톨로지 v1](../ontology-v1.md) 4장의 표와 `ontology_versions.required_evidence_by_edge_type` 컬럼이다. 검사기(`graph/ontology.py`)는 컬럼을 읽어 판정하므로 두 값이 어긋나면 문서가 아니라 컬럼이 실행의 규칙이 된다.

`0002_seed_reference.sql` 이 시드한 값이 문서와 네 곳에서 어긋난다.

| 엣지 | 문서 | 시드 |
| --- | --- | --- |
| `BELONGS_TO_CLUSTER` | `company_cluster_memberships.membership_id` | 요구하지 않음 |
| `COMPUTED_FROM` | 요구하지 않음 | `statistic_fact` |
| `PRODUCED_BY` | 요구하지 않음 | `agent_run` |
| `DERIVED_FROM` | `analysis_claims.claim_id` | `checklist_item` |

`COMPUTED_FROM`은 `StatisticFact → Assignment`이고 `PRODUCED_BY`는 `AnalysisOutput → AgentRun`이다. 시드는 두 엣지에 출발 노드가 이미 가리키는 행을 근거로 요구한다. `DERIVED_FROM`은 `ChecklistItem → AnalysisClaim`인데 시드가 출발점인 체크리스트 항목을 근거로 요구한다.

`BELONGS_TO_CLUSTER`는 같은 문서 5장이 파생 관계로 지정한 엣지다. 시드가 근거를 요구하지 않는다.

두 값이 어긋난 것을 깨뜨리는 검사가 없다. 검사는 시드를 읽어 검사기와 대조할 뿐이고 문서를 읽지 않는다.

## 결정

문서를 기준으로 두고 시드를 문서에 맞춘다.

- [AGENTS.md](../../AGENTS.md)의 문서 소유권 표가 그래프 노드·엣지 유형, 허용 연결, 엣지별 필수 근거의 기준 문서를 [온톨로지 v1](../ontology-v1.md)로 지정한다. `ontology_versions` 행은 그 정의의 구현이다.
- `0020_ontology_evidence_alignment` migration이 `required_evidence_by_edge_type` 컬럼만 갱신한다. `node_types`·`edge_types`·`allowed_connections`는 이미 문서와 일치하므로 건드리지 않는다.
- `ontology_version`을 올리지 않는다. v1로 남긴다.
- 문서의 표와 시드의 최종 상태를 대조하는 검사를 둔다. 두 값이 다시 어긋나면 그 검사가 깨진다.

## 고려한 선택지

| 선택지 | 결과 |
| --- | --- |
| 시드를 기준으로 두고 문서를 고친다 | 순환하는 근거 요구가 정의가 되고, 파생 엣지 하나가 원천 대조 없이 남는다 |
| `0002_seed_reference.sql`을 직접 고친다 | 이미 적용된 migration을 고치는 것이라 적용된 데이터베이스와 새로 만든 데이터베이스의 상태가 갈린다 |
| 새 migration으로 컬럼을 갱신하고 v2를 발행한다 | 바뀐 적 없는 정의에 두 번째 버전이 붙고 직무 그래프 전량 재구축이 따라온다 |
| 새 migration으로 컬럼만 갱신하고 v1을 유지한다 | 정의는 그대로 두고 그 구현의 값만 고친다 |

## 선택 이유

근거 요구는 엣지가 주장하는 관계를 다른 행으로 확인하는 장치다. 출발 노드가 가리키는 행을 근거로 다시 요구하면 확인되는 사실이 없다. `COMPUTED_FROM`과 `PRODUCED_BY`의 시드 값이 그렇다.

파생 엣지는 원천 행을 가리켜야 `파생 일치` 검사가 성립한다(온톨로지 v1 5·7장). `BELONGS_TO_CLUSTER`가 근거를 요구하지 않으면 그 검사가 이 엣지에 대해 아무것도 하지 않는다.

`DERIVED_FROM`의 근거는 도착점인 주장이다. 체크리스트 항목이 어떤 주장에서 나왔는지가 이 엣지가 주장하는 내용이며, 항목 자체는 근거가 아니라 엣지의 한 끝이다.

버전을 올리지 않는 이유는 정의가 바뀌지 않았기 때문이다. 온톨로지 v1 8장의 버전 변경 규칙은 필수 근거를 강화할 때 새 버전을 요구하지만, 이는 정의를 바꾸는 절차다. v1의 필수 근거는 처음부터 문서에 적힌 그대로이고 이번 변경은 그 정의를 옮겨 적을 때 생긴 값의 오류를 바로잡는다. 새 버전을 발행하면 노드·엣지 식별자가 버전을 담으므로 그래프 전체를 다시 만들어야 하며, 정의가 같은데 재구축을 요구하게 된다.

## 결과와 제약

- 검사기가 요구하는 근거 종류의 이름은 저장소의 조회 표(`SemanticGraphRepository._EVIDENCE_KEYS`, `LineageGraphRepository._EVIDENCE_KEYS`)와 짝이 맞아야 한다. 목록에 없는 종류는 `근거 실재` 검사가 항상 거짓을 주므로, 새로 요구하는 `cluster_membership`과 `analysis_claim`이 두 표에 등록되기 전까지 두 엣지가 폐기된다.
- `DERIVED_FROM`의 `evidence_id`는 체크리스트 항목이 아니라 주장을 담는다. 계보 기록 파이프라인이 넘기는 값이 바뀐다.
- 이 migration 이전에 만들어진 엣지 행의 `evidence_id`는 소급해 고치지 않는다. 재구축이 같은 식별자로 다시 만들며, 어긋난 행은 검증이 폐기하고 다시 기록한다.
- 문서와 시드의 대조는 검사가 맡는다. 어느 한쪽만 고치면 검사가 깨진다.
- `ontology_versions`는 `OPERATOR_ONLY_TABLES`이므로 이후의 갱신도 migration으로만 한다.
