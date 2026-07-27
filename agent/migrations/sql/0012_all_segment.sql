-- 대상군 축에 all 을 더한다.
-- all 행의 분모는 대상군으로 제한하지 않은 모집단 전체다. 화면의 기본 표시 기준이며,
-- 대상군별 행과 분모가 다른 별개의 행이다. 정의는 docs/metric-spec.md 2.7 이다.

ALTER TABLE statistics_facts
  DROP CONSTRAINT IF EXISTS statistics_facts_entry_segment_check;
ALTER TABLE statistics_facts
  ADD CONSTRAINT statistics_facts_entry_segment_check
  CHECK (entry_segment IN ('all', 'entry_junior', 'experienced', 'unspecified'));

ALTER TABLE capability_depth_profiles
  DROP CONSTRAINT IF EXISTS capability_depth_profiles_entry_segment_check;
ALTER TABLE capability_depth_profiles
  ADD CONSTRAINT capability_depth_profiles_entry_segment_check
  CHECK (entry_segment IN ('all', 'entry_junior', 'experienced', 'unspecified'));
