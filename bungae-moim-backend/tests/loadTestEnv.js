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
// 타임존을 고정한다. 날짜 관련 로직(생년월일 → 성인 판별 등)은 로컬 게터로 날짜를
// 읽기 때문에, 머신의 타임존이 다르면 같은 테스트가 다른 결과를 낸다. 이 저장소는
// 여러 사람이 함께 쓰므로 어디서 돌려도 같은 결과가 나오도록 KST로 못박는다.
process.env.TZ = 'Asia/Seoul';

// 안전장치: 어떤 이유로든 DATABASE_URL이 bungae_test를 가리키지 않으면
// 즉시 실패시켜, 실수로 개발 DB(bungae)에 대해 테스트(및 TRUNCATE)가
// 실행되는 일을 막는다.
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('/bungae_test')) {
  throw new Error(
    `[tests/loadTestEnv] DATABASE_URL이 bungae_test를 가리키지 않습니다. ` +
      `.env.test 설정을 확인하세요. 현재 값: ${process.env.DATABASE_URL}`
  );
}
