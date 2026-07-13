// Jest `setupFilesAfterEnv` 항목: 테스트 프레임워크(afterEach 등 전역 함수)가
// 준비된 뒤, 각 테스트 파일마다 실행된다.
//
// - afterEach: 매 테스트가 끝날 때마다 public 스키마의 모든 테이블(마이그레이션
//   추적용 pgmigrations 테이블 제외)을 TRUNCATE해서 데이터를 정리한다.
//   테이블 목록을 코드에 하드코딩하지 않고 pg_tables에서 동적으로 조회하므로,
//   Epic B에서 마이그레이션(테이블)이 추가돼도 이 파일을 수정할 필요가 없다.
//   지금처럼 테이블이 0개여도 에러 없이 그냥 아무 것도 하지 않는다.
//
// - afterAll: 테스트 파일의 모든 테스트가 끝나면 커넥션 풀을 정리해서 Jest가
//   좀비 커넥션 때문에 종료되지 않는 문제를 막는다.
//
// TRUNCATE(테이블 비우기) 방식을 선택한 이유: 이 프로젝트는 1인 개발/소규모
// 백엔드이고, 트랜잭션-롤백 방식은 앱 코드가 커넥션 풀 자체를 요청마다 가져다
// 쓰는 구조(src/config/db.js의 pg.Pool)와 맞물려 "테스트마다 같은 트랜잭션 안에서
// 커넥션을 강제로 공유"하도록 앱 코드/미들웨어를 특별히 손봐야 해서 복잡도가
// 커진다. TRUNCATE는 구현이 단순하고, 이 프로젝트 규모에서 성능도 충분하다.

const { Pool } = require('pg');

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('/bungae_test')) {
  throw new Error(
    `[tests/setupTestDb] DATABASE_URL이 bungae_test를 가리키지 않습니다. ` +
      `현재 값: ${process.env.DATABASE_URL}`
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

afterEach(async () => {
  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'pgmigrations'`
  );

  if (rows.length > 0) {
    const tableList = rows.map((row) => `"${row.tablename}"`).join(', ');
    await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  }
});

afterAll(async () => {
  await pool.end();
});

module.exports = pool;
