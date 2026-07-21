-- 0008: 다중 사용자 라우팅(G2/G3) 조회 경로 인덱스 보강
-- 근거: docs/discord-linking.md §7.1 (사용자별 순회), DB 총점검(2026-07-21)
--
-- 배경: 인터랙션·monitor가 service role로 동작해 RLS를 우회하므로, 다중 사용자 격리는
--   애플리케이션 레벨 user_id 스코프(G2/G3에서 전환)로 보장된다. RLS 정책·FK cascade는
--   전 테이블 정합함을 확인했다. 남은 것은 자주 도는 조회 경로 2건의 인덱스 공백뿐.
--
-- 모두 additive · IF NOT EXISTS · 데이터 변경 없음 → 무중단 적용 가능.

-- 1) reviews.user_id 조회 경로
--    monitor.fetchMemoryLine(user_id + trades.ticker 조인)·review-agent.get_past_reviews(user_id)가
--    user_id로 필터하는데 기존 인덱스는 (trade_id) 뿐이었다.
create index if not exists reviews_user_created_idx
  on reviews (user_id, created_at desc);

-- 2) monitor의 "전 사용자 active 조건" 스캔
--    monitor는 5분마다 status='active' 전체를 조회한다(사용자 무관). 기존 인덱스는
--    (user_id, status)로 선두 컬럼이 user_id라 status 단독 스캔에 부적합하다.
--    active 행만 담는 부분 인덱스로 hot query를 직접 커버한다.
create index if not exists conditions_active_idx
  on conditions (status)
  where status = 'active';
