-- 차원 후보가 제안하는 차원 종류.
-- 정의는 docs/erd.md 7.7 이고 값 집합은 docs/erd.md 7.3 의 `dimension_kind` 와 같다.
--
-- 승격이 만드는 차원의 종류를 `practice` 로 고정하면 `dimension_kind` 가
-- `technology` 인 행이 하나도 생기지 않고, `Technology` 그래프 노드가 영원히 0 개로
-- 남는다(docs/ontology-v1.md 2.1). 종류는 후보를 명명하는 판정이 함께 내며 이 컬럼이
-- 그 값을 담는 자리다.
--
-- NULL 을 허용한다. 이 migration 이전에 만들어진 후보 행과 종류를 고르지 못한 판정은
-- 값을 갖지 않는다. 값을 지어내면 기술이 아닌 요구가 `Technology` 노드가 된다.
-- 비어 있는 값은 승격이 `practice` 로 떨어뜨리고 그 사실을 실행 결과에 남긴다.

ALTER TABLE requirement_candidates
  ADD COLUMN proposed_dimension_kind text
    CHECK (proposed_dimension_kind IN
           ('technology','practice','domain','collaboration','tooling'));
