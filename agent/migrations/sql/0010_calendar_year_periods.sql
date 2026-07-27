-- 기간 축을 달력 연도로 바꾼다.
-- 요구 수준의 변화가 연 단위로 읽히고, 기준일이 움직여도 같은 공고가 같은 기간에 남는다.
-- 이전 기간의 하한 2024-01-01 은 그보다 앞선 공고의 기술 구성이 달라 기준선 비교에 쓰지 않기 때문이다.

INSERT INTO periods (period_id, label, starts_on, ends_on, is_baseline) VALUES
  ('y2026',      '2026년',      '2026-01-01', '2026-12-31', true),
  ('y2024_2025', '2024~2025년', '2024-01-01', '2025-12-31', false);

-- 참조하는 지표 행이 있으면 이 삭제가 실패한다. 기간 정의를 조용히 바꾸지 않는다.
DELETE FROM periods WHERE period_id IN ('recent_12m', 'prior_12m');
