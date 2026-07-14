jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode, exchangeKakaoCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/google', () => {
  it('code가 없으면 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('신규 사용자면 회원가입 후 세션을 발급하고 isNewUser: true를 반환한다', async () => {
    exchangeGoogleCode.mockResolvedValueOnce({
      providerId: 'google-1',
      email: 'a@test.com',
      nickname: '홍길동',
    });

    const agent = request.agent(app);
    const res = await agent.post('/api/auth/google').send({ code: 'abc' });

    expect(res.status).toBe(200);
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.user.nickname).toBe('홍길동');
    expect(res.body.data.user.birthDateRequired).toBe(true);
  });

  it('이미 로그인 상태에서 다시 요청하면 같은 사용자로 로그인되고 isNewUser: false', async () => {
    exchangeGoogleCode.mockResolvedValue({
      providerId: 'google-2',
      email: 'b@test.com',
      nickname: 'B',
    });

    const agent = request.agent(app);
    const first = await agent.post('/api/auth/google').send({ code: 'first' });
    const second = await agent.post('/api/auth/google').send({ code: 'second' });

    expect(second.body.data.isNewUser).toBe(false);
    expect(second.body.data.user.id).toBe(first.body.data.user.id);
  });
});

describe('POST /api/auth/kakao', () => {
  it('code가 없으면 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/kakao').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('신규 사용자면 회원가입 후 세션을 발급하고 isNewUser: true를 반환한다', async () => {
    exchangeKakaoCode.mockResolvedValueOnce({
      providerId: 'kakao-1',
      email: 'k@test.com',
      nickname: '카카오유저',
    });

    const agent = request.agent(app);
    const res = await agent.post('/api/auth/kakao').send({ code: 'abc' });

    expect(res.status).toBe(200);
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.user.nickname).toBe('카카오유저');
  });

  it('구글과 카카오가 같은 email이어도 별개 계정으로 취급한다', async () => {
    exchangeGoogleCode.mockResolvedValueOnce({
      providerId: 'dup-google',
      email: 'same@test.com',
      nickname: 'GoogleUser',
    });
    exchangeKakaoCode.mockResolvedValueOnce({
      providerId: 'dup-kakao',
      email: 'same@test.com',
      nickname: 'KakaoUser',
    });

    const googleRes = await request
      .agent(app)
      .post('/api/auth/google')
      .send({ code: 'g' });
    const kakaoRes = await request
      .agent(app)
      .post('/api/auth/kakao')
      .send({ code: 'k' });

    expect(kakaoRes.body.data.user.id).not.toBe(googleRes.body.data.user.id);
  });
});

describe('POST /api/auth/logout', () => {
  it('로그인 상태에서 로그아웃하면 세션이 파기된다', async () => {
    exchangeGoogleCode.mockResolvedValueOnce({
      providerId: 'logout-user',
      email: 'l@test.com',
      nickname: 'L',
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/google').send({ code: 'abc' });

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data.status).toBe('logged_out');

    const meRes = await agent.get('/api/users/me');
    expect(meRes.status).toBe(401);
  });

  it('로그인하지 않은 상태에서도 200을 반환한다', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});
