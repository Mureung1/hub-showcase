// Jest `globalSetup`: 전체 테스트 실행 중 단 한 번, 별도의 프로세스 컨텍스트에서
// 실행된다(워커와 메모리를 공유하지 않으므로 여기서 설정한 process.env는
// 테스트 파일 쪽에 전달되지 않는다 — 그래서 tests/loadTestEnv.js가 각 테스트
// 파일에서 별도로 .env.test를 다시 로드한다).
//
// 목적: bungae_test DB에 대해 마이그레이션(node-pg-migrate up)을 실행해서
// 스키마를 최신 상태로 맞춰둔다. 지금은 migrations/ 폴더에 파일이 0개이지만
// (Epic B에서 채워짐), node-pg-migrate는 마이그레이션 파일이 없어도 에러 없이
// 정상 종료하고 pgmigrations 추적 테이블만 생성한다.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const dotenv = require('dotenv');

module.exports = async function globalSetup() {
  const projectRoot = path.resolve(__dirname, '..');
  const envPath = path.join(projectRoot, '.env.test');

  const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));

  // 안전장치: 마이그레이션을 실행하기 전, .env.test가 실제로 bungae_test를
  // 가리키는지 확인한다. 개발 DB(bungae)에 대해 실수로 마이그레이션이
  // 실행되는 것을 막기 위함이다.
  if (!parsed.DATABASE_URL || !parsed.DATABASE_URL.includes('/bungae_test')) {
    throw new Error(
      `[tests/globalSetup] .env.test의 DATABASE_URL이 bungae_test를 가리키지 않습니다. ` +
        `현재 값: ${parsed.DATABASE_URL}`
    );
  }

  const migrateBin = path.join(
    projectRoot,
    'node_modules',
    'node-pg-migrate',
    'bin',
    'node-pg-migrate.js'
  );

  console.log('[tests/globalSetup] bungae_test DB에 마이그레이션 실행 중...');

  execFileSync(process.execPath, [migrateBin, 'up', '--envPath', envPath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
};
