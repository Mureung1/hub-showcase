const express = require('express');
const request = require('supertest');
const pool = require('../src/config/db');
const sessionMiddleware = require('../src/config/session');
const requireAuth = require('../src/middleware/auth');
const errorHandler = require('../src/middleware/errorHandler');

// requireAuth/createUser는 tests/setupTestDb.js와 별개로 src/config/db.js의
// 공유 풀을 직접 사용한다(앱 코드가 실제로 쓰는 것과 동일한 풀을 재사용하기 위함).
// 이 풀은 이 테스트 파일의 모듈 레지스트리에서만 생성되므로, 이 파일이 끝난 뒤
// 직접 닫아줘야 Jest가 열린 커넥션 때문에 종료 지연 경고를 내지 않는다.
afterAll(async () => {
  await pool.end();
});

function buildTestApp() {
  const app = express();
  app.use(sessionMiddleware);
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ data: { userId: req.session.userId } });
  });
  // 테스트 전용: 세션에 강제로 userId를 심는 라우트
  app.post('/test-login/:userId', (req, res) => {
    req.session.userId = Number(req.params.userId);
    res.json({ data: 'ok' });
  });
  app.use(errorHandler);
  return app;
}

async function createUser({ suspendedUntil = null } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname, suspended_until)
     VALUES ('google', $1, 'a@test.com', 'A', $2) RETURNING id`,
    [`provider-id-${Date.now()}-${Math.random()}`, suspendedUntil]
  );
  // bigserial 컬럼이라 pg가 문자열로 반환하므로(64비트 정수 정밀도 손실 방지),
  // req.session.userId(Number)와 엄격 비교(toBe)할 수 있도록 숫자로 정규화한다.
  return Number(rows[0].id);
}

describe('requireAuth', () => {
  it('세션 없이 접근하면 401 UNAUTHENTICATED', async () => {
    const res = await request(buildTestApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('로그인 상태면 통과한다', async () => {
    const userId = await createUser();
    const agent = request.agent(buildTestApp());
    await agent.post(`/test-login/${userId}`);
    const res = await agent.get('/protected');
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(userId);
  });

  it('정지된 계정이면 403 SUSPENDED', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const userId = await createUser({ suspendedUntil: future });
    const agent = request.agent(buildTestApp());
    await agent.post(`/test-login/${userId}`);
    const res = await agent.get('/protected');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SUSPENDED');
  });
});
