# 평가 세트

CareerSignal 에이전트의 품질을 사람이 확정한 정답과 대조해 채점하는 자료다. 정의와 용도는 [데이터 전략 9장](../data-strategy.md#9-데이터셋과-평가-세트)에 있다.

## 파일

| 파일 | 담는 것 | 대응 |
| --- | --- | --- |
| `backend_v1.json` | 백엔드 공고별 기대 요구 표현과 위치 | `evaluation_sets` 한 행 |
| `backend_dimensions_v1.json` | 백엔드 기대 차원과 깊이 등급 | `evaluation_sets` 한 행 |
| `frontend_v1.json` | 프론트엔드 공고별 기대 요구 표현과 위치 | `evaluation_sets` 한 행 |
| `frontend_dimensions_v1.json` | 프론트엔드 기대 차원과 깊이 등급 | `evaluation_sets` 한 행 |
| `rubrics_v1.json` | 해석 루브릭, 용어 연결 기준, 근거 허용 범위 | 채점 기준 정책 |

직무마다 세트를 따로 둔다. `evaluation_sets.job_role_id`가 한 값이며 직무별 지표는 서로 섞이지 않는다.

기대 차원을 별도 세트로 두는 이유는 확정 단위가 다르기 때문이다. `status`는 파일 하나에 하나이며, 표현 선정과 차원 배정은 서로 다른 시점에 확정된다. 차원 세트는 `evaluation_runs`에서 자기 실행과 자기 지표를 가지며 차원 승격 심사의 대조 결과로 쓰인다. 절차는 [통계 모델](../statistics-model.md) 3.4에 있다.

두 직무의 대상 공고는 자료의 성격이 다르다. 백엔드 세트는 수집한 실 공고를, 프론트엔드 세트는 생성 공고를 가리킨다. 구분은 [생성 데이터 기반 세트](#생성-데이터-기반-세트)에 있다.

## 채점 대상

`backend_v1.json`과 `frontend_v1.json`은 요구 표현 추출을 채점한다. 지표는 정밀도와 재현율 두 가지다.

| 지표 | 분자 | 분모 |
| --- | --- | --- |
| 정밀도 | 기대 항목과 일치한 추출 mention 수 | 에이전트가 추출한 mention 수 |
| 재현율 | 기대 항목과 일치한 추출 mention 수 | 기대 항목 수 |

일치 판정은 항목의 `rubric`을 따른다. `raw_expression`이 원문의 부분 문자열과 일치하고 `requiredness`가 같으면 정답으로 센다.

`expected_entry_label`과 `expected_job_role_id`는 대상군·직무 범위 일치를 함께 확인한다. 판정 규칙은 [지표 명세](../metric-spec.md) 2.6과 2.8에 있다.

`backend_dimensions_v1.json`과 `frontend_dimensions_v1.json`은 차원 할당 정확도를 채점한다. 지표는 라벨 축과 깊이 축 두 가지이며 분모는 둘 다 기대 항목 수다.

| 지표 | 분자 | 분모 |
| --- | --- | --- |
| 차원 라벨 정확도 | 기대 라벨 집합과 같은 집합을 배정한 mention 수 | 기대 항목 수 |
| 깊이 등급 정확도 | 기대 깊이 등급과 같은 등급을 배정한 mention 수 | 기대 항목 수 |

## 생성 데이터 기반 세트

프론트엔드 두 세트의 대상은 `agent/scripts/demo_seed/frontend.py`가 만드는 생성 공고 아홉 건이다. 식별자는 `dp_frontend_01`~`dp_frontend_09`이며 규약은 [데모 시드 계약](../../agent/data/demo_seed/CONTRACT.md) 1장의 `dp_<job>_<nn>`을 따른다. `dataset_version`은 생성 데이터 전용 값인 `ds_demo_v1`이다.

| 키 | 값 |
| --- | --- |
| `posting_id` | `dp_frontend_<nn>` |
| `source_id` | `src_demo_frontend_<nn>` |
| `content_root` | `agent/data/demo_seed/parts/frontend/` |
| `content_file` | `source_snapshots.csv` |

원문은 스냅샷 CSV의 `raw_content` 열에 있다. 행은 `snap_demo_frontend_<nn>`으로 찾으며 `source_id`와 `nn`이 같다. 원문은 공고 제목 한 줄과 `[주요업무]`·`[자격요건]`·`[우대사항]` 세 구간으로 이루어지고, 표현 단위는 구간 안의 한 줄이다. `requiredness`는 구간 제목이 정한다.

| 구간 | `stated_requiredness` | `requiredness` |
| --- | --- | --- |
| `[주요업무]` | 담당업무 | `responsibility` |
| `[자격요건]` | 필수 | `required` |
| `[우대사항]` | 우대 | `preferred` |

생성 데이터를 대상으로 삼는 세트에는 세 가지 한계가 있다.

- 공고 문장을 생성 모듈이 썼으므로 실 공고의 표기 흔들림, 구간 제목의 변형, 한 줄에 여러 요구가 섞이는 자리가 없다. 표현 단위를 어디서 끊는지는 이 세트가 검증하지 못한다.
- 차원 여덟 종과 깊이 등급이 생성 시점에 이미 정해져 있다. 이 세트는 추출과 할당이 그 기준을 재현하는지 보며, 분류체계 자체가 실 공고를 덮는지는 보지 못한다.
- 공고 아홉 건에 기대 항목은 60개다. 지표 하나의 분모가 작아 항목 하나의 판정이 백분율을 크게 움직인다.

`ds_demo_v1`은 실 데이터 버전과 섞지 않는다. 두 세트의 지표는 같은 축에서 비교하지 않는다.

## 구조

파일 하나가 `evaluation_sets` 한 행이고, `cases`가 `evaluation_cases`, `expected_items`가 `evaluation_expected_items`에 대응한다. 컬럼 정의는 [ERD](../erd.md) 13장에 있다.

| 키 | 대응 | 비고 |
| --- | --- | --- |
| `eval_set_id`, `job_role_id`, `source_file` | `evaluation_sets` | `loaded_at`은 적재 시점에 채운다 |
| `case_id`, `case_type`, `posting_id` | `evaluation_cases` | 비어 있으면 `source_id`로 적재 시점에 해결한다 |
| `expected_id`, `expected_field`, `expected_value`, `rubric` | `evaluation_expected_items` | `expected_value`는 jsonb |

`dimension_labels`와 `rubric_file`은 컬럼이 아니다. 적재 시점의 대조에 쓰고 데이터베이스에는 남지 않는다.

백엔드 세트는 `posting_id`를 비우고 `source_id`로 해결한다. 프론트엔드 세트는 대상 공고의 식별자가 데모 시드 계약으로 고정되어 있어 `posting_id`를 직접 적는다.

### 요구 표현 세트의 `expected_value`

| 필드 | 내용 |
| --- | --- |
| `raw_expression` | 공고 원문의 부분 문자열 |
| `stated_requiredness` | 공고가 쓴 구간 라벨 원문 |
| `requiredness` | `required`, `preferred`, `responsibility` 중 하나로 정규화한 값 |
| `section` | 그 표현을 포함하는 구간 제목의 원문 한 줄 |
| `evidence_quote` | 원문에서 그대로 잘라낸 한 줄 |

`raw_expression`, `section`, `evidence_quote`는 `content_file`이 가리키는 원문에서 문자열 검색으로 찾을 수 있다.

### 차원 세트의 `expected_value`

| 필드 | 내용 |
| --- | --- |
| `mention_expected_id` | 같은 직무 요구 표현 세트의 `expected_id`. 두 세트를 잇는 값 |
| `raw_expression` | 요구 표현 세트가 담은 표현 그대로 |
| `requiredness` | 요구 표현 세트가 담은 값 그대로 |
| `dimension_labels` | 그 표현이 가리키는 기대 차원 라벨. 한 표현이 둘을 가리키면 둘을 담는다 |
| `depth_signal` | 깊이 등급을 결정한 원문 신호 |
| `depth_level` | `foundation`, `application`, `tradeoff` 중 하나 |

기대 차원은 분류체계 버전과 독립적인 사람 기준이므로 `requirement_dimensions`를 외래키로 참조하지 않고 라벨 문자열로 적는다. 근거는 [ERD](../erd.md) 13장이다. 세트의 `dimension_labels`가 라벨마다 정의와 인접 차원 경계를 담는다. 기대 항목은 이 목록 밖의 라벨을 쓰지 않는다.

`depth_signal`은 `depth_level`의 판정 근거이며 대응 관계는 `rubrics_v1.json`의 `signal_map`이 담는다. 백엔드 세트는 `rb_depth_level_grade`, 프론트엔드 세트는 `rb_frontend_depth_signal`을 가리킨다. 등급의 정의는 [지식·저장 구조](../knowledge-schema.md) 8.2에 있다.

신호 목록은 직무마다 다르다. 깊이를 가르는 원문 신호가 직무별로 다르기 때문이다. 프론트엔드 세트가 쓰는 여덟 신호는 다음과 같다.

| 신호 | 등급 | 조건 |
| --- | --- | --- |
| `knowledge_only` | `foundation` | 도구나 기술을 써 본 사실만 묻는다 |
| `routine_maintenance` | `foundation` | 정해진 규칙대로 기존 화면과 스타일을 유지하는 일만 적혀 있다 |
| `applied_experience` | `application` | 만들고 개선하고 운영한 경험을 묻는다 |
| `design_choice` | `tradeoff` | 구조나 체계를 설계한다고 적는다 |
| `scale` | `tradeoff` | 규모, 동시 사용자, 실시간을 명시한다 |
| `measured_metric` | `tradeoff` | 성능 지표를 측정하거나 프로파일링해 개선 근거로 삼는다 |
| `critical_flow` | `tradeoff` | 결제와 송금처럼 실패 비용이 큰 흐름의 상태나 검증을 요구한다 |
| `certification_standard` | `tradeoff` | 외부 인증 기준을 지키고 점검할 책임을 요구한다 |

## 루브릭 정책

`rubrics_v1.json`은 채점 기준을 담는다. 개별 케이스의 정답은 평가 세트 파일이 담는다. 세 표의 어느 행도 아니며 `evaluation_expected_items.rubric`이 `rubric_id`로 이 파일의 정책을 가리킨다. 식별자는 `rb_`로 시작하고, 접두사가 정책 참조와 항목에 직접 적은 판정 문장을 가른다.

| 묶음 | 담는 것 | 기준 문서 |
| --- | --- | --- |
| `mention_extraction` | 요구 표현 일치와 구간별 `requiredness` 정규화 | [지표 명세](../metric-spec.md) 2.6과 2.8 |
| `dimension_assignment` | 차원 라벨 일치와 깊이 등급 판정 | [지식·저장 구조](../knowledge-schema.md) 8.2, [지표 명세](../metric-spec.md) 3.3 |
| `interpretation` | 요구의 세 구분과 주장 유형별 근거 충족 | [에이전트 설계](../agent-design.md) 7.4와 8장 |
| `standard_mapping` | `standard_mapping_status` 다섯 값의 부여 조건 | [통계 모델](../statistics-model.md) 4장 |
| `evidence_scope` | 주장 유형과 자료 계층의 교차 허용 범위 | [데이터 전략](../data-strategy.md) 3장 |

각 정책은 `decision`에 판정 한 문장, `pass_when`에 정답으로 세는 조건, `fail_when`에 오답으로 세는 조건을 담는다. `reference`가 기준 문서의 조항을 가리킨다.

`rb_evidence_tier_scope`는 주장 유형 일곱 종과 자료 계층 A~E의 교차를 `matrix`에 담는다. 칸의 값은 `지지`, `보강`, `용어 연결만`, `후보 탐색만`, `미지지` 다섯 가지다. `보강` 칸의 근거는 `지지` 칸의 근거가 함께 있을 때만 센다.

`rb_mapping_unmapped`는 `unmapped`를 정상 상태로 둔다. 표준 문서가 최신 기술 어휘를 담지 못하는 자리에서 나오는 상태이며 결함이 아니다.

직무별 정책은 공통 정책과 같은 파일에 둔다. 파일을 나누면 `evaluation_expected_items.rubric` 하나가 어느 파일을 가리키는지 항목마다 달라진다. 프론트엔드 세트가 가리키는 정책은 세 가지다.

| 식별자 | 담는 것 | 이어지는 공통 정책 |
| --- | --- | --- |
| `rb_frontend_mention_extraction` | 생성 공고의 표현 단위와 구간별 `requiredness` | 없음 |
| `rb_frontend_dimension_assignment` | 라벨 후보를 프론트엔드 차원 여덟 종으로 한정한 판정 | `rb_dimension_assignment` |
| `rb_frontend_depth_signal` | 프론트엔드 깊이 신호 여덟 종과 등급의 대응 | `rb_depth_level_grade` |

## 확정 범위

다섯 파일의 `status`는 모두 `draft`다. 확정하는 주체는 사람이며, 파일마다 사람이 확정하는 것과 초안이 정하는 것을 아래에 나눈다.

`draft`는 채점을 막지 않는다. 초안 세트로 채점한 결과도 추이 자료이므로 `evaluation_metrics`와 `evaluation_failures`에 남는다. 세트나 루브릭 정책이 `draft`인 동안 릴리스 게이트는 그 결과를 수용 판정의 근거로 쓰지 않고, 활성화를 막지도 허용하지도 않는 판정만 남긴다. 초안으로 채점해 추이를 보는 것과 그 결과를 릴리스 게이트로 쓰는 것을 가르는 자리다.

게이트는 분석 버전의 상태를 스스로 올리지 않는다. 기준에 못 미치면 사유만 남기고, 충족하면 활성화해도 된다는 판정을 돌려준다. 활성화 절차는 [아키텍처](../architecture.md) 8장, 수용 기준 항목은 [검증 체크리스트](../checklist.md)에 있다.

### `backend_v1.json`

| 구분 | 내용 |
| --- | --- |
| 사람이 확정한다 | 공고별 기대 항목의 선정과 개수, `requiredness` 정규화, 루브릭, 표현 단위를 어디서 끊는지 |
| 초안이 정한다 | 원문에서 잘라낸 문자열, `section`, 매니페스트와 대조한 `expected_entry_label`과 `expected_job_role_id` |

기대 항목은 공고의 모든 문장을 담지 않고 핵심 요구를 대표하는 8~15개를 담는다. 무엇이 핵심인지는 사람이 정한다.

### `backend_dimensions_v1.json`

| 구분 | 내용 |
| --- | --- |
| 사람이 확정한다 | 차원 목록의 입도와 경계, 한 표현이 두 차원을 가리키는지, 깊이 등급 배정 |
| 초안이 정한다 | `backend_v1.json`에서 그대로 옮긴 `raw_expression`과 `requiredness`, `depth_signal`에서 유도한 `depth_level` |

차원 목록은 30개이며 78개 기대 항목이 근거다. 목록의 입도는 사람이 고른 값이다. 인접 차원을 합칠지 나눌지는 [통계 모델](../statistics-model.md) 3.2의 관계 판정을 따른다.

### `frontend_v1.json`

| 구분 | 내용 |
| --- | --- |
| 사람이 확정한다 | 기대 항목의 선정과 개수, 표현 단위를 원문 한 줄로 두는 결정, 루브릭 |
| 초안이 정한다 | 생성 공고에서 옮긴 문자열과 `section`, 구간 제목이 정하는 `requiredness`, 데모 시드 계약이 정하는 `posting_id`와 `expected_entry_label` |

기대 항목은 아홉 공고의 요구 표현 전부인 60개이며 공고마다 6~9개다. 생성 공고는 요구 표현만 담으므로 핵심을 고르는 단계가 없다.

### `frontend_dimensions_v1.json`

| 구분 | 내용 |
| --- | --- |
| 사람이 확정한다 | 차원 여덟 종의 경계, 깊이 신호 목록과 신호별 등급, 표현 하나가 차원 하나만 가리킨다는 결정 |
| 초안이 정한다 | `frontend_v1.json`에서 그대로 옮긴 `raw_expression`과 `requiredness`, `depth_signal`에서 유도한 `depth_level` |

차원 목록은 여덟 개이며 60개 기대 항목이 근거다. 모든 항목의 `dimension_labels` 크기는 1이다.

같은 표현은 공고가 달라도 같은 `depth_signal`과 같은 `depth_level`을 받는다. 정답의 단위가 표현 하나이기 때문이다.

### `rubrics_v1.json`

| 구분 | 내용 |
| --- | --- |
| 사람이 확정한다 | `pass_when`과 `fail_when`의 문장, `rb_evidence_tier_scope`의 칸 값, `rb_depth_level_grade`와 `rb_frontend_depth_signal`의 신호 표 |
| 초안이 정한다 | 식별자와 묶음 이름, `reference`가 가리키는 기준 문서의 조항 |

정책의 내용은 기준 문서에서 옮긴 것이며 기준 문서가 바뀌면 정책도 다시 확정한다.
