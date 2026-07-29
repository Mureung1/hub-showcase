jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/users/me', () => {
  it('비로그인 상태면 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('로그인 상태면 내 정보를 반환한다', async () => {
    exchangeGoogleCode.mockResolvedValueOnce({
      providerId: 'me-user-1',
      email: 'me@test.com',
      nickname: '내정보',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/google').send({ code: 'abc' });

    const res = await agent.get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('me@test.com');
    expect(res.body.data.nickname).toBe('내정보');
    expect(res.body.data.birthDate).toBeNull();
    expect(res.body.data.trustScore).toBe(50);
    expect(res.body.data.evaluationCount).toBe(0);
  });

  // 위 테스트는 신규 유저라 DB 컬럼 기본값도 0이라, normalizeUser의 `?? 0` 폴백이
  // evaluation_count 컬럼 누락을 가려도 통과해버린다(리뷰 지적). 컬럼이 실제로 값을
  // 실어 나르는지 확인하려면 0이 아닌 값으로 직접 갱신한 뒤 API로 읽어야 한다
  // (trustScore.recalc.test.js의 직접 DB 조작 패턴을 그대로 따름).
  it('DB의 evaluation_count가 0이 아니면 그 값을 그대로 반환한다', async () => {
    exchangeGoogleCode.mockResolvedValueOnce({
      providerId: 'me-user-2',
      email: 'me2@test.com',
      nickname: '평가있음',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/google').send({ code: 'abc' });

    const before = await agent.get('/api/users/me');
    const userId = before.body.data.id;

    await pool.query('UPDATE users SET evaluation_count = 7 WHERE id = $1', [userId]);

    const res = await agent.get('/api/users/me');
    expect(res.status).toBe(200);
    expect(res.body.data.evaluationCount).toBe(7);
  });
});
