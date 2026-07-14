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
  });
});
