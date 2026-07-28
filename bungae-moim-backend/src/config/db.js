const { Pool } = require('pg');

// DATABASE_URL 형식: postgres://user:password@host:port/dbname
// meetings.start_at/end_at은 timestamp(타임존 없음)에 KST 벽시계 값으로 저장된다.
// meetingService의 `COALESCE(end_at, start_at) >= now()` 비교는 세션 타임존을 기준으로 하므로,
// DB 서버가 UTC면(관리형 Postgres 기본값) 이미 끝난 모임이 9시간 더 "모집중"으로 남는다.
// 커넥션 시작 파라미터로 고정한다 — pool.on('connect')에서 SET TIME ZONE을 쏘는 방식은
// "이미 쿼리 중인 client에 query()" 경고를 내고 pg@9에서 제거될 예정이라 쓰지 않는다.
// (로컬 Postgres는 이미 Asia/Seoul이라 사실상 no-op이고, 테스트도 같은 풀을 쓴다.)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=Asia/Seoul',
});

module.exports = pool;
