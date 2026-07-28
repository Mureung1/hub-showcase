-- 지표 정책 v1 의 불확실성 방법을 수식과 맞춘다.
-- 근거는 docs/metric-spec.md 2.5·3.4·3.5 다.
--
-- `metric_policy_versions.uncertainty_method` 는 그 family 가 구간을 어떤 방법으로
-- 계산하는지를 정하는 자리다(docs/erd.md 10.3). 시드가 넣은 두 행이 명세와 어긋나
-- 있었다.
--
-- `cluster_contrast` 는 불확실성을 두지 않는다(3.4). 두 measure 가 서로 다른 두
-- 모집단의 비율에서 파생하므로 한 이항 분포의 구간으로 표현되지 않는다. 그런데
-- 정책 행은 `wilson_95` 를 선언하고 있었다. 코드가 이 조합을 막고 있어 저장된 값은
-- 옳았지만(`metrics/policy.py` 의 `FAMILIES_WITHOUT_UNCERTAINTY`), 행이 쓰지 않는
-- 방법을 선언한 채로 남으면 정책 표만 보고는 어느 쪽이 맞는지 가릴 수 없다. CHECK 가
-- 허용하는 `none` 이 이 자리의 값이다.
--
-- `cooccurrence` 는 `jaccard` 와 두 조건부 확률에 Wilson 95% 를 저장한다(3.5). 그런데
-- 정책 행은 `none` 을 선언하고 있었다. 이 값은 구간이 성립하는 세 measure 의 구간까지
-- 함께 지운다. `count` 와 `association_lift` 를 빼는 것은 정책이 아니라 measure 목록이
-- 하므로(`metrics/policy.py` 의 `MEASURES_WITHOUT_UNCERTAINTY`) family 의 방법은
-- `wilson_95` 다.
--
-- 코드의 판정을 걷어내지 않는다. 어떤 measure 에 구간이 성립하는가는 수식이 정하고
-- 정책은 방법을 고를 뿐이다. 두 자리가 함께 있어야 새 정책 버전이 다시 어긋난 방법을
-- 선언해도 저장값이 명세를 지킨다.
--
-- 이 두 행으로 계산된 지표 행은 아직 없다. Phase 13 의 첫 실행이 이 migration 뒤에
-- 돈다.

UPDATE metric_policy_versions
   SET uncertainty_method = 'none'
 WHERE metric_policy_version = 'mp_v1_contrast'
   AND metric_family = 'cluster_contrast';

UPDATE metric_policy_versions
   SET uncertainty_method = 'wilson_95'
 WHERE metric_policy_version = 'mp_v1_cooccurrence'
   AND metric_family = 'cooccurrence';
