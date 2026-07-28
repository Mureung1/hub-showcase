-- 차원 후보의 판정 맥락 두 컬럼.
-- 정의는 docs/erd.md 7.7 이고 근거는 docs/adr/0011-candidate-judgment-context.md 다.
--
-- 관계 판정은 판정에 건 기존 차원 목록에 상대적이고, 그 목록은 특정 분류체계
-- 버전의 활성 어휘에서 나온다. 어느 버전 기준의 판정인지 남지 않으면 승격 심사가
-- 판정을 그대로 쓸 수 없다.
--
-- 판정 근거 문장도 남길 자리가 없었다. 발견이 만든 문장이 실행 결과 모델에만 있고
-- 저장되지 않아, 심사와 사람 검토가 판정의 이유를 읽지 못한다.
--
-- 두 컬럼 모두 NULL 을 허용한다. 이 migration 이전에 만들어진 후보 행은 값을 갖지
-- 않으며, 값을 지어내면 그 후보가 어느 버전 기준으로 판정되었는지 틀리게 남는다.

ALTER TABLE requirement_candidates
  ADD COLUMN judged_against_taxonomy_version_id text
    REFERENCES requirement_taxonomy_versions ON DELETE RESTRICT,
  ADD COLUMN judgment_rationale text;

-- 승격 심사가 활성 버전과 판정 기준 버전을 견준다. 후보는 분류체계마다 모이므로
-- 이 인덱스의 선행 컬럼을 taxonomy_id 로 둔다.
CREATE INDEX idx_candidates_judged_against
  ON requirement_candidates (taxonomy_id, judged_against_taxonomy_version_id);
