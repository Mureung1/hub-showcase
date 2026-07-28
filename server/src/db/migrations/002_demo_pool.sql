-- 002_demo_pool.sql — 시연용 소비자 계정 풀 (로그인 미구현 단계의 임시 장치)
--
-- 부스에서 여러 방문자가 QR로 동시에 들어올 때 같은 계정을 공유하면
-- 내 예약에 남의 예약이 보이고 알림도 전원에게 간다. 로그인 도입 전까지
-- 미리 만들어둔 계정을 한 명씩 나눠주기 위한 표다.
--
-- 로그인(C1) 구현 시 이 테이블과 관련 API는 제거한다.

CREATE TABLE demo_pool (
  user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ
);

-- 배정 순서: 한 번도 안 쓴 계정 먼저, 그다음 가장 오래전에 쓴 계정
-- (전원 소진 후에는 자연스럽게 처음으로 돌아가 순환한다)
CREATE INDEX idx_demo_pool_rotation ON demo_pool (assigned_at NULLS FIRST, user_id);
