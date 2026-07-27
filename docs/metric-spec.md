# CareerSignal 지표 명세

## 1. 문서 목적

이 문서는 지표 family 일곱 종과 시간 연산자의 분자·분모, 중복 제거 단위, 결측 처리, 불확실성 계산을 정의한다. 집계 파이프라인이 이 정의를 구현한다.

발견과 승격 절차, 지표가 화면 블록에 연결되는 방식은 [통계 모델](statistics-model.md), 테이블 정의는 [ERD](erd.md)에 있다.

## 2. 공통 규약

### 2.1 모집단

모든 지표의 분모 모집단은 `posting_versions`다. 범위와 기간으로 거른다.

```sql
FROM posting_versions pv
JOIN postings p ON p.posting_id = pv.posting_id
JOIN periods pd ON pd.period_id = :period_id
WHERE p.job_role_id = :job_role_id
  AND pv.dataset_version = :dataset_version
  AND pv.posted_at::date BETWEEN pd.starts_on AND pd.ends_on
```

`scope_level`에 따라 조건을 더한다.

| `scope_level` | 추가 조건 |
| --- | --- |
| `overall` | 없음 |
| `cluster` | `as_of_date` 기준 `company_cluster_memberships`로 해석한 소속이 `scope_id`와 일치 |
| `posting` | `p.posting_id = :scope_id` |

기업군 조건은 다음으로 표현한다.

```sql
AND EXISTS (
  SELECT 1 FROM company_cluster_memberships m
  WHERE m.company_id = p.company_id
    AND m.cluster_id = :scope_id
    AND m.valid_from <= :as_of_date
    AND (m.valid_to IS NULL OR m.valid_to >= :as_of_date)
)
```

### 2.2 중복 제거

모든 지표의 중복 제거 단위는 `posting_version_id`다. 한 공고 버전에서 같은 차원이 여러 mention으로 나타나도 한 번 센다.

```sql
COUNT(DISTINCT pv.posting_version_id)
```

### 2.3 할당 조인

차원을 받는 지표는 활성 분류체계의 할당만 사용한다.

```sql
JOIN requirement_mentions rm ON rm.posting_version_id = pv.posting_version_id
JOIN posting_requirement_assignments a ON a.mention_id = rm.mention_id
JOIN requirement_dimension_versions dv
  ON dv.dimension_id = a.dimension_id
 AND dv.taxonomy_version_id = a.taxonomy_version_id
WHERE a.taxonomy_version_id = :taxonomy_version_id
  AND dv.lifecycle_status = 'active'
```

`lifecycle_status`가 `active`가 아닌 차원은 집계에 포함하지 않는다.

### 2.4 결측 처리

| 상황 | 처리 |
| --- | --- |
| 분모가 0 | `sample_status = 'not_computable'`, `value`는 NULL |
| 분모가 `minimum_n` 미만 | `sample_status = 'low_confidence'`, `value` 저장 |
| 분모가 `minimum_n` 이상이나 `minimum_n_comparison` 미만 | `sample_status = 'not_comparable'`, `value` 저장 |
| 분모가 `minimum_n_comparison` 이상 | `sample_status = 'analysis_ready'` |
| 적용 불가 조합 | 행을 만들지 않는다 |

`not_comparable`인 행은 기간 비교와 기업군 비교의 입력으로 쓰지 않는다. 단일 값 표시는 허용한다.

`insufficient` 상태의 행도 저장한다. 계산하지 못했다는 사실 자체가 화면의 정보이며, 값을 지우면 "아직 안 돌렸다"와 "돌렸는데 표본이 없다"를 구분할 수 없다.

### 2.5 불확실성

비율을 산출하는 지표는 Wilson score 95% 구간을 저장한다.

```text
z  = 1.959964
p  = numerator / denominator
n  = denominator
c  = 1 + z² / n
mid = (p + z² / (2n)) / c
half = z / c * sqrt( p(1-p)/n + z² / (4n²) )

lower = max(0, mid - half)
upper = min(1, mid + half)
```

```json
{ "method": "wilson_95", "lower": 0.412, "upper": 0.734 }
```

정규 근사 대신 Wilson을 쓰는 이유는 분모가 작거나 비율이 0과 1에 가까울 때 구간이 정의역을 벗어나지 않기 때문이다. MVP 구간의 분모가 작으므로 이 성질이 필요하다.

`count`와 `difference`를 산출하는 measure는 불확실성을 저장하지 않고 `uncertainty`를 NULL로 둔다.

### 2.6 `entry_label` 정규화

`posting_versions.entry_label_raw`에서 `entry_label`을 결정한다.

| 원문 패턴 | 값 |
| --- | --- |
| 신입만 지칭 | `entry` |
| 주니어·초급만 지칭 | `junior` |
| 신입과 주니어를 함께 지칭 | `entry_junior` |
| 경력 연차 하한을 명시 | `experienced` |
| 대상군 표기 없음 | `unspecified` |

판정은 규칙으로 수행하고 규칙이 결정하지 못한 값만 생성 모델로 분류한다. 판정 결과는 `entry_label`에 담고 원문은 `entry_label_raw`에 보존한다.

### 2.7 대상군

`entry_label`은 공고 하나의 표기이고, 대상군은 지표의 그룹 축이다. 표기 다섯 값을 축 세 값으로 접는다.

| `entry_label` | `entry_segment` |
| --- | --- |
| `entry`, `junior`, `entry_junior` | `entry_junior` |
| `experienced` | `experienced` |
| `unspecified` | `unspecified` |

같은 직무·기업군·기간이라도 신입·주니어에게 요구하는 수준과 경력에게 요구하는 수준이 다르다. 한 기준선에 섞으면 어느 쪽도 맞지 않는다.

`unspecified`를 `entry_junior`에 합치지 않는다. 표기가 없는 공고를 신입 기준선에 넣으면 기준선이 실제보다 높아진다.

모든 지표 행은 대상군을 갖는다. 서로 다른 대상군의 수치를 하나의 기준선으로 비교하지 않는다.

## 3. 지표 family

### 3.1 `posting_prevalence`

한 차원이 범위·기간의 공고 중 몇 %에 나타나는가.

| 항목 | 정의 |
| --- | --- |
| 입력 | 차원, 범위, 기간 |
| `input_arity` | `one_dimension` |
| measure | `ratio` |
| 분자 | 해당 차원 할당이 있는 `posting_version` 수 |
| 분모 | 범위·기간의 `posting_version` 수 |
| 출력 단위 | `ratio` |
| 불확실성 | Wilson 95% |

```sql
SELECT
  COUNT(DISTINCT CASE WHEN a.dimension_id = :dimension_id
                      THEN pv.posting_version_id END) AS numerator,
  COUNT(DISTINCT pv.posting_version_id)               AS denominator
```

### 3.2 `requiredness_ratio`

해당 차원이 나타난 공고 중 필수로 표기한 비율.

| 항목 | 정의 |
| --- | --- |
| 입력 | 차원, 범위, 기간 |
| `input_arity` | `one_dimension` |
| measure | `ratio` |
| 분자 | `requiredness = 'required'`인 할당이 있는 `posting_version` 수 |
| 분모 | 해당 차원 할당이 있는 `posting_version` 수 |
| 불확실성 | Wilson 95% |

분모가 `posting_prevalence`의 분자와 같다. 전체 모집단이 아니다.

한 공고에 같은 차원의 `required` 할당과 `preferred` 할당이 함께 있으면 `required`로 센다. 공고가 한 번이라도 필수로 표기했으면 필수 요구다.

### 3.3 `depth_distribution`

해당 차원이 나타난 공고를 깊이 등급으로 나눈 분포.

| 항목 | 정의 |
| --- | --- |
| 입력 | 차원, 범위, 기간 |
| `input_arity` | `one_dimension` |
| measure | `foundation`, `application`, `tradeoff` |
| 분자 | 대표 등급이 해당 등급인 `posting_version` 수 |
| 분모 | 해당 차원 할당이 있는 `posting_version` 수 |
| 불확실성 | 등급별 Wilson 95% |

**대표 등급 규칙.** 한 공고 버전이 같은 차원에 대해 여러 깊이의 할당을 가지면 가장 깊은 등급 하나만 센다. 순서는 `foundation < application < tradeoff`다.

```sql
SELECT pv.posting_version_id,
       MAX(CASE a.depth_level
             WHEN 'tradeoff'   THEN 3
             WHEN 'application' THEN 2
             ELSE 1 END) AS depth_rank
FROM ...
GROUP BY pv.posting_version_id
```

이 규칙이 세 measure의 분자 합을 분모와 정확히 일치시킨다. 백분율로 읽히며 100%를 넘지 않는다. 준비 기준으로도 맞다. 가장 깊은 요구에 맞추면 아래 등급은 따라온다.

### 3.4 `cluster_contrast`

기업군이 직무 전체와 얼마나 다른가.

| 항목 | 정의 |
| --- | --- |
| 입력 | 차원, 기업군, 기간 |
| `input_arity` | `dimension_cluster` |
| measure | `prevalence_difference`, `prevalence_ratio` |
| 불확실성 | 없음 |

두 measure를 각각 한 행으로 저장한다.

```text
cluster_prevalence  = 기업군 범위의 posting_prevalence
baseline_prevalence = overall 범위의 posting_prevalence

prevalence_difference = cluster_prevalence - baseline_prevalence
prevalence_ratio      = cluster_prevalence / baseline_prevalence
```

`baseline_prevalence`가 0이면 `prevalence_ratio` 행을 만들지 않는다. `prevalence_difference` 행만 저장한다.

**저장 형태.** 두 measure 모두 `value`에 결과를 담고 `numerator`·`denominator`에는 **기업군 범위의 원본 카운트**를 담는다. `statistics_facts`의 `numerator`·`denominator`는 정수 카운트만 담는다는 규약을 지키기 위해서다. 직무 전체 값은 같은 분석 버전의 `posting_prevalence` 행에서 조회한다.

`sample_status`는 기업군 분모와 직무 전체 분모 **둘 다** `minimum_n_comparison` 이상일 때만 `analysis_ready`다. 한쪽이라도 미달이면 `not_comparable`이다.

### 3.5 `cooccurrence`

두 차원이 함께 요구되는 정도.

| 항목 | 정의 |
| --- | --- |
| 입력 | 차원 두 개, 범위, 기간 |
| `input_arity` | `two_dimensions` |
| measure | `count`, `jaccard`, `conditional_a_given_b`, `conditional_b_given_a`, `association_lift` |

```text
A  = A 차원 할당이 있는 posting_version 집합
B  = B 차원 할당이 있는 posting_version 집합
N  = 범위·기간의 posting_version 수

count                 = |A ∩ B|
jaccard               = |A ∩ B| / |A ∪ B|
conditional_a_given_b = |A ∩ B| / |B|
conditional_b_given_a = |A ∩ B| / |A|
association_lift      = (|A ∩ B| / N) / ((|A| / N) × (|B| / N))
```

교집합 크기를 `n_ab`, 각 집합 크기를 `n_a`·`n_b`, 합집합 크기를 `n_union`, 모집단을 `n_total`로 적는다.

| measure | 분자 | 분모 | 불확실성 |
| --- | --- | --- | --- |
| `count` | `n_ab` | NULL | 없음 |
| `jaccard` | `n_ab` | `n_union` | Wilson 95% |
| `conditional_a_given_b` | `n_ab` | `n_b` | Wilson 95% |
| `conditional_b_given_a` | `n_ab` | `n_a` | Wilson 95% |
| `association_lift` | `n_ab` | `n_total` | 없음 |

`association_lift`는 비율의 비율이라 Wilson 구간이 성립하지 않는다. `numerator`·`denominator`에는 교집합 수와 모집단 수를 담고 `value`에 lift를 담는다.

차원 쌍은 `dimension_id < secondary_dimension_id` 순서로 정규화해 한 쌍당 한 행만 저장한다. 방향이 있는 두 조건부 확률은 measure로 구분한다.

### 3.6 `scope_expansion`

역할 경계를 넘어선 요구가 얼마나 나타나는가.

| 항목 | 정의 |
| --- | --- |
| 입력 | 범위, 기간 |
| `input_arity` | `scope_only` |
| measure | `ratio` |
| 분자 | `role_boundary_eligible`이 참인 차원 할당이 하나 이상 있는 `posting_version` 수 |
| 분모 | 범위·기간의 `posting_version` 수 |
| 불확실성 | Wilson 95% |

차원을 받지 않는다. 경계 차원 중 무엇이든 하나라도 있으면 분자에 센다.

```sql
AND dv.role_boundary_eligible = true
```

`role_boundary_eligible`은 `requirement_dimension_versions`의 컬럼이므로 분류체계 버전마다 다시 판정한다. 백엔드 공고의 프론트엔드 요구, 구현 직무의 운영·인프라 요구가 해당한다.

### 3.7 `entry_label_advanced_signal_rate`

신입·주니어라고 표기한 공고 중 심화 신호를 포함한 비율.

| 항목 | 정의 |
| --- | --- |
| 입력 | 범위, 기간 |
| `input_arity` | `scope_only` |
| measure | `ratio` |
| 분자 | `depth_level = 'tradeoff'`인 할당이 하나 이상 있는 `posting_version` 수 |
| 분모 | `entry_label IN ('entry','junior','entry_junior')`인 `posting_version` 수 |
| 불확실성 | Wilson 95% |

```sql
WHERE pv.entry_label IN ('entry','junior','entry_junior')
```

분모가 전체 모집단이 아니라 대상군이 표기된 공고로 제한된다. `unspecified`와 `experienced`는 제외한다.

이 지표는 관측값이며 기대값과의 차이가 아니다. 라벨별 기대 심화 비율을 정의하기 전에는 차이를 계산하지 않는다.

## 4. 시간 연산자

`temporal_delta`는 독립 지표가 아니라 다른 지표에 적용하는 연산자다.

```text
temporal_delta(base_metric, measure, scope, period_a, period_b)
  = value(base_metric, measure, scope, period_b)
  - value(base_metric, measure, scope, period_a)
```

저장 시 다음을 함께 기록한다.

| 항목 | 값 |
| --- | --- |
| `metric_family` | `temporal_delta` |
| `measure` | `<base_metric>__<measure>` 형태 |
| `period_id` | `period_b` |
| `numerator` | `period_b`의 분자 |
| `denominator` | `period_b`의 분모 |
| `value` | 차이 |
| `sample_size` | 두 기간 분모 중 **작은 값** |
| `uncertainty` | 없음 |

`sample_size`에 작은 쪽을 담는 이유는 비교의 신뢰도가 표본이 적은 기간에 좌우되기 때문이다.

두 기간 중 하나라도 `sample_status`가 `not_comparable` 이하이면 `temporal_delta` 행을 만들지 않는다. 비교 불가로 표시된 값끼리 뺀 결과는 의미가 없다.

어떤 지표의 변화인지를 `measure`에 반드시 남긴다. `temporal_delta` 단독으로는 해석할 수 없다.

## 5. 적용 가능성

지표마다 입력 차수가 다르다. 모든 지표를 모든 차원에 적용하지 않는다.

| family | 차원 필요 | 전개 단위 |
| --- | --- | --- |
| `posting_prevalence` | 하나 | 차원 × 범위 × 대상군 × 기간 |
| `requiredness_ratio` | 하나 | 차원 × 범위 × 대상군 × 기간 |
| `depth_distribution` | 하나 | 차원 × 범위 × 대상군 × 기간 |
| `cluster_contrast` | 하나 | 차원 × 기업군 × 대상군 × 기간 |
| `cooccurrence` | 둘 | 차원 쌍 × 범위 × 대상군 × 기간 |
| `scope_expansion` | 없음 | 범위 × 대상군 × 기간 |
| `entry_label_advanced_signal_rate` | 없음 | 범위 × 기간 |

`entry_label_advanced_signal_rate`는 대상군으로 전개하지 않는다. 분모가 이미 신입·주니어 표시 공고이므로 `entry_junior` 외의 대상군에서는 정의되지 않는다. 저장 시 `entry_segment`는 `entry_junior`를 갖는다.

`dimension_metric_applicability`에 분류체계 버전별로 적용 가능 여부를 기록한다. `applicable`이 거짓인 조합은 계산하지 않으며, 계산된 행이 있으면 검증에서 차단한다.

차원 쌍의 전개는 조합 폭발을 막기 위해 `posting_prevalence`가 `minimum_n` 이상인 차원끼리만 수행한다.

## 6. 정책 버전

최소 표본, 억제 정책, 불확실성 방법은 `metric_policy_versions`의 행이다. 코드 상수가 아니다.

v1 값은 실데이터 확보 이전의 잠정값이다.

| 항목 | v1 | 근거 |
| --- | --- | --- |
| `minimum_n` | 5 | 5건 미만에서는 한 건이 20%p를 움직여 비율이 의미를 잃는다 |
| `minimum_n_comparison` | 10 | 두 집단 비교에서 각 10건이 최소 판별 규모다 |
| `uncertainty_method` | `wilson_95` | 소표본과 극단 비율에서 구간이 정의역을 벗어나지 않는다 |
| `suppression_policy` | `label_low_confidence` | 숨기지 않고 낮은 신뢰도로 표시한다 |

MVP 규모는 공고 18~30건이다. `overall` 범위는 `analysis_ready`가 되지만 기업군 6종으로 나누면 군당 3~5건이라 대부분 `low_confidence`나 `not_computable`이 된다. 이 상태가 정상이며 화면은 표본 수를 함께 표시한다.

실공고를 적재한 뒤 P13에서 분포를 확인하고 v2를 발행한다. 정책 버전이 다른 수치는 비교하지 않는다.

## 7. 검증

집계 산출물은 다음을 검사한다. 판정 형식은 [에이전트 설계](agent-design.md) 9장을 따른다.

| 검사 | 내용 |
| --- | --- |
| 분모 일치 | 모집단 조건이 범위·기간 정의와 일치한다 |
| 중복 제거 | `posting_version_id` 단위로 중복이 제거되었다 |
| 분자 상한 | `numerator <= denominator` |
| 분포 합 | `depth_distribution` 세 measure의 분자 합이 분모와 같다 |
| 표본 판정 | `sample_status`가 정책 버전의 임계값과 일치한다 |
| 재계산 일치 | 독립 재계산 결과가 저장값과 일치한다 |
| 버전 일치 | `taxonomy_version_id`, `metric_policy_version`이 실행 컨텍스트와 일치한다 |
| 적용 가능성 | 적용 불가로 표시된 조합이 계산되지 않았다 |
| 비교 가능성 | `temporal_delta`와 `cluster_contrast`의 입력이 `analysis_ready`다 |

## 8. 관련 문서

- [통계 모델](statistics-model.md)
- [ERD](erd.md)
- [에이전트 설계](agent-design.md)
- [지식·저장 구조](knowledge-schema.md)
