module.exports = {
  testEnvironment: 'node',
  // 테스트 프레임워크가 설치되기 전, 각 테스트 파일마다 .env.test를 로드해서
  // bungae_test DB를 가리키도록 강제한다.
  setupFiles: ['<rootDir>/tests/loadTestEnv.js'],
  // afterEach/afterAll 같은 전역 함수가 준비된 뒤, 테스트 DB 정리(TRUNCATE)
  // 훅과 커넥션 풀 종료 훅을 등록한다.
  setupFilesAfterEnv: ['<rootDir>/tests/setupTestDb.js'],
  // 전체 실행 중 한 번, bungae_test DB에 마이그레이션을 실행해 스키마를
  // 최신 상태로 맞춘다.
  globalSetup: '<rootDir>/tests/globalSetup.js',
  testTimeout: 10000,
};
