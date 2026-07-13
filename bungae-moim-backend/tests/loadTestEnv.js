// Jest `setupFiles` 항목: 각 테스트 파일이 로드되기 전, 테스트 프레임워크가
// 설치되기도 전에 실행된다. 여기서 .env.test를 로드해서 DATABASE_URL 등을
// bungae_test DB를 가리키도록 강제한다.
//
// 이후 애플리케이션 코드(src/app.js 등)가 `require('dotenv').config()`를
// 다시 호출하더라도, dotenv는 기본적으로 이미 설정된 환경변수를 덮어쓰지
// 않으므로 여기서 설정한 값이 유지된다.

const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env.test');

dotenv.config({ path: envPath, override: true });
process.env.NODE_ENV = 'test';

// 안전장치: 어떤 이유로든 DATABASE_URL이 bungae_test를 가리키지 않으면
// 즉시 실패시켜, 실수로 개발 DB(bungae)에 대해 테스트(및 TRUNCATE)가
// 실행되는 일을 막는다.
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('/bungae_test')) {
  throw new Error(
    `[tests/loadTestEnv] DATABASE_URL이 bungae_test를 가리키지 않습니다. ` +
      `.env.test 설정을 확인하세요. 현재 값: ${process.env.DATABASE_URL}`
  );
}
