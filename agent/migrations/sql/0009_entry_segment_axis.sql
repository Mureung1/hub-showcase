-- 대상군을 지표의 그룹 축으로 추가한다.
--
-- 기존 구조는 데이터셋 전체가 신입·주니어라는 전제 위에 있었다. 대상군은
-- posting_versions.entry_label 에만 있었고 지표는 그것을 모집단 필터로만 썼다.
--
-- 같은 직무·기업군·기간이라도 신입·주니어에게 요구하는 수준과 경력에게 요구하는
-- 수준이 다르다. 한 기준선에 섞으면 어느 쪽도 맞지 않는다. 두 대상군의 기준선을
-- 나란히 두어야 신입 공고가 실제로 몇 년 차 수준을 요구하는지 말할 수 있다.
--
-- 표기 다섯 값을 축 세 값으로 접는다. unspecified 를 신입·주니어에 합치지 않는다.
-- 표기가 없는 공고를 신입 기준선에 넣으면 기준선이 실제보다 높아진다.
--
-- 정의는 docs/metric-spec.md 2.6, docs/statistics-model.md 5장이다.
-- 기존 행이 없으므로 기본값 없이 NOT NULL 로 추가한다.

ALTER TABLE statistics_facts
  ADD COLUMN entry_segment text NOT NULL
  CHECK (entry_segment IN ('entry_junior', 'experienced', 'unspecified'));

ALTER TABLE capability_depth_profiles
  ADD COLUMN entry_segment text NOT NULL
  CHECK (entry_segment IN ('entry_junior', 'experienced', 'unspecified'));

-- 같은 지표를 대상군마다 하나씩 갖는다. 축을 유일 조건에 넣지 않으면
-- 두 대상군의 값이 서로를 덮어쓴다.
DROP INDEX IF EXISTS idx_statistics_facts_unique;
CREATE UNIQUE INDEX idx_statistics_facts_unique ON statistics_facts (
  analysis_version, metric_family, measure, scope_level, scope_id, period_id,
  entry_segment,
  COALESCE(dimension_id, ''), COALESCE(secondary_dimension_id, '')
);

DROP INDEX IF EXISTS idx_statistics_facts_lookup;
CREATE INDEX idx_statistics_facts_lookup ON statistics_facts
  (analysis_version, scope_level, scope_id, entry_segment, period_id, metric_family);

ALTER TABLE capability_depth_profiles
  DROP CONSTRAINT IF EXISTS capability_depth_profiles_analysis_version_capability_id_sc_key;

ALTER TABLE capability_depth_profiles
  ADD CONSTRAINT capability_depth_profiles_scope_unique
  UNIQUE (analysis_version, capability_id, scope_level, scope_id, entry_segment, period_id);

-- 분모가 이미 신입·주니어 표시 공고인 지표는 다른 대상군에서 정의되지 않는다.
ALTER TABLE statistics_facts
  ADD CONSTRAINT entry_signal_rate_segment CHECK (
    metric_family <> 'entry_label_advanced_signal_rate'
    OR entry_segment = 'entry_junior'
  );
