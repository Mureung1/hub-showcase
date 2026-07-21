// PATCH /api/users/me — 생년월일 최초 입력(D5).
// 핵심: 형식 검증, 이미 설정된 값은 잠금(최초 1회), 정상 입력 후 birthDate가 응답에 실림.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

async function loginAgent(providerId, nickname = '유저') {
  exchangeGoogleCode.mockResolvedValueOnce({
    providerId,
    email: `${providerId}@test.com`,
    nickname,
  });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/google').send({ code: 'code' });
  return { agent, userId: Number(res.body.data.user.id) };
}

describe('PATCH /api/users/me', () => {
  it('비로그인은 401', async () => {
    const res = await request(app).patch('/api/users/me').send({ birthDate: '2001-05-20' });
    expect(res.status).toBe(401);
  });

  it('형식이 틀리면 400 VALIDATION_ERROR', async () => {
    const { agent } = await loginAgent('patch-bad-format');
    const res = await agent.patch('/api/users/me').send({ birthDate: '2001/05/20' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('존재하지 않는 달력 날짜는 400', async () => {
    const { agent } = await loginAgent('patch-bad-day');
    const res = await agent.patch('/api/users/me').send({ birthDate: '2001-02-30' });
    expect(res.status).toBe(400);
  });

  it('미래 날짜는 400', async () => {
    const { agent } = await loginAgent('patch-future');
    const res = await agent.patch('/api/users/me').send({ birthDate: '2999-01-01' });
    expect(res.status).toBe(400);
  });

  it('정상 입력 시 birthDate가 응답에 실린다', async () => {
    const { agent } = await loginAgent('patch-ok');
    const res = await agent.patch('/api/users/me').send({ birthDate: '2001-05-20' });
    expect(res.status).toBe(200);
    expect(res.body.data.birthDate).toBe('2001-05-20');
  });

  it('이미 설정된 생년월일은 다시 수정할 수 없다(400)', async () => {
    const { agent } = await loginAgent('patch-locked');
    await agent.patch('/api/users/me').send({ birthDate: '2001-05-20' });
    const res = await agent.patch('/api/users/me').send({ birthDate: '1990-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
