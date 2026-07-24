// Day5 통합 회귀 테스트: 이번 주 슬라이스(로그인 → 내 정보 → 모임 등록 → 모임 수정 → 목록 조회)가
// 한 세션에서 끊김 없이 이어서 동작하는지 확인한다. 각 라우트 단위 테스트는 따로 있으므로
// 여기서는 "여러 단계가 세션/데이터로 실제로 연결되는지"만 본다.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

// 로그인된 supertest agent를 만든다(OAuth 코드 교환은 목킹해서 세션만 발급).
async function loginAgent(providerId = 'slice-user', nickname = '슬라이스') {
  exchangeGoogleCode.mockResolvedValueOnce({
    providerId,
    email: `${providerId}@test.com`,
    nickname,
  });
  const agent = request.agent(app);
  await agent.post('/api/auth/google').send({ code: 'abc' });
  return agent;
}

const flashBody = {
  type: 'flash',
  title: '통합 회귀 풋살',
  category: '운동',
  description: '로그인부터 목록까지 한 번에 확인하는 모임',
  regionSido: '서울특별시',
  regionSigungu: '강남구',
  regionEupmyeondong: '역삼동',
  startAt: '2030-07-09T19:00:00+09:00',
  endAt: null,
  capacity: 4,
  adultOnly: false,
  openChatUrl: 'https://open.kakao.com/o/slice-1',
};

describe('통합 회귀: 로그인 → 내 정보 → 모임 등록 → 모임 수정 → 목록 조회', () => {
  it('한 세션에서 전체 슬라이스가 이어서 동작한다', async () => {
    const agent = await loginAgent();

    // 1) 내 정보 조회 — 로그인 세션이 유지되는지 확인
    const me = await agent.get('/api/users/me');
    expect(me.status).toBe(200);
    expect(me.body.data.nickname).toBe('슬라이스');

    // 2) 모임 등록 — 등록 응답에는 openChatUrl이 포함된다(모임장이 링크를 받아야 하므로)
    const created = await agent.post('/api/meetings').send(flashBody);
    expect(created.status).toBe(201);
    expect(created.body.data.id).toBeDefined();
    expect(created.body.data.title).toBe('통합 회귀 풋살');
    expect(created.body.data.openChatUrl).toBe(flashBody.openChatUrl);

    const newId = created.body.data.id;

    // 3) 모임 수정(E4) — 모임장이 방금 등록한 모임을 수정한다(제목·지역 변경, type·정원 유지).
    const editRes = await agent
      .patch(`/api/meetings/${newId}`)
      .send({
        type: 'flash',
        title: '수정된 통합 테스트 모임',
        category: '운동',
        description: '수정됨',
        regionSido: '서울특별시',
        regionSigungu: '송파구',
        regionEupmyeondong: null,
        startAt: '2030-07-09T19:00:00+09:00',
        endAt: null,
        capacity: 4,
        adultOnly: false,
        openChatUrl: 'https://open.kakao.com/o/slice-1-edited',
      });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.title).toBe('수정된 통합 테스트 모임');
    expect(editRes.body.data.regionSigungu).toBe('송파구');

    // 4) 목록 조회 — 수정 후에도 같은 모임이 바뀐 제목으로 조회되고, 목록엔 openChatUrl이 비노출
    const list = await agent.get('/api/meetings');
    expect(list.status).toBe(200);
    const found = list.body.data.items.find((m) => m.id === newId);
    expect(found).toBeDefined();
    expect(found.title).toBe('수정된 통합 테스트 모임');
    expect(found).not.toHaveProperty('openChatUrl');
  });

  it('로그아웃하면 세션이 파기되어 내 정보 조회가 401이 된다', async () => {
    const agent = await loginAgent('slice-logout', '로그아웃유저');

    const before = await agent.get('/api/users/me');
    expect(before.status).toBe(200);

    await agent.post('/api/auth/logout');

    const after = await agent.get('/api/users/me');
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('UNAUTHENTICATED');
  });
});
