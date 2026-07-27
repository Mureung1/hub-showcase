-- 검증 판정값과 수리 동작 목록 정합.
--
-- verdict 는 검사를 실행한 결과만 담는다. 경고 수준은 severity 가 담으므로
-- 'warn' 은 severity = 'warning' 과 의미가 겹친다. 대신 검사가 적용 대상이
-- 아니어서 실행하지 않은 상태를 'skip' 으로 구분한다. 검사 6 교차 모델 감사는
-- 위험 기반 표본에만 적용하므로 이 구분이 없으면 미적용과 누락을 구별할 수 없다.
--
-- 수리 동작에 'request_research' 를 더한다. 외부 근거 확보가 필요한 실패는
-- 재검색·근거 교체와 다른 처리를 받으며, 검증 파이프라인이 research_requests 에
-- 요청을 발행한다.
--
-- verdict·severity·autonomy_level 은 검사마다 항상 정해지므로 NOT NULL 로 둔다.
-- NULL 이 남으면 릴리스 게이트가 검사하지 않은 산출물을 차단 판정 없음으로 읽는다.
-- reason_code·repair_action·judge_model·detail 은 실패한 검사와 A1 검사만 가지므로
-- nullable 을 유지한다.
--
-- 0001 이 만든 제약은 컬럼 인라인 선언이라 Postgres 가 이름을 자동으로 붙였다.
-- 여기서는 이름을 명시해 이후 migration 이 대상을 특정할 수 있게 한다.

ALTER TABLE verification_results
  DROP CONSTRAINT IF EXISTS verification_results_verdict_check;

ALTER TABLE verification_results
  ADD CONSTRAINT verification_results_verdict_check
  CHECK (verdict IN ('pass', 'fail', 'skip'));

ALTER TABLE verification_results ALTER COLUMN verdict SET NOT NULL;
ALTER TABLE verification_results ALTER COLUMN severity SET NOT NULL;
ALTER TABLE verification_results ALTER COLUMN autonomy_level SET NOT NULL;

ALTER TABLE repair_orders
  DROP CONSTRAINT IF EXISTS repair_orders_action_check;

ALTER TABLE repair_orders
  ADD CONSTRAINT repair_orders_action_check
  CHECK (action IN (
    'requery', 'add_counterevidence', 'swap_evidence', 'drop_claim',
    'narrow_scope', 'lower_confidence', 'recompute_stat', 'fix_identifier',
    'request_research'
  ));
