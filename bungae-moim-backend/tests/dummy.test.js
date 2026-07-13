// Task A2 완료 기준: 더미 테스트가 `npm test`로 통과하는지 확인한다.
// 두 번째 테스트는 완료 기준에 명시된 "테스트가 bungae_test를 향하고 bungae는
// 건드리지 않는다"는 것을 실행 시점에 스스로 검증하는 안전장치다.

describe('테스트 환경 셋업 (Task A2)', () => {
  test('더미 테스트: 테스트 파이프라인이 동작한다', () => {
    expect(true).toBe(true);
  });

  test('테스트는 개발 DB(bungae)가 아닌 bungae_test를 대상으로 한다', () => {
    expect(process.env.DATABASE_URL).toMatch(/\/bungae_test$/);
    expect(process.env.DATABASE_URL).not.toMatch(/\/bungae$/);
  });
});
