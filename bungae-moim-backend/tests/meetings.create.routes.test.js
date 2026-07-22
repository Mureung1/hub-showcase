jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

// 로그인된 supertest agent를 만들어 준다.
async function loginAgent(providerId = 'host-1', nickname = '모임장') {
  exchangeGoogleCode.mockResolvedValueOnce({
    providerId,
    email: `${providerId}@test.com`,
    nickname,
  });
  const agent = request.agent(app);
  await agent.post('/api/auth/google').send({ code: 'abc' });
  return agent;
}

const validFlashBody = {
  type: 'flash',
  title: '오늘 저녁 풋살 4명',
  category: '운동',
  description: 'OO풋살장에서 즐겁게 뛰실 분',
  regionSido: '서울특별시',
  regionSigungu: '강남구',
  regionEupmyeondong: '역삼동',
  startAt: '2030-07-09T19:00:00+09:00',
  endAt: null,
  capacity: 4,
  adultOnly: false,
  openChatUrl: 'https://open.kakao.com/o/abc123',
};

const validSmallBody = {
  type: 'small',
  title: '주말 독서 소모임',
  category: '스터디',
  description: '매주 만나요',
  regionSido: '서울특별시',
  regionSigungu: '마포구',
  startAt: '2030-07-10T10:00:00+09:00',
  endAt: '2030-12-31T10:00:00+09:00',
  adultOnly: false,
  openChatUrl: 'https://open.kakao.com/o/xyz789',
};

describe('POST /api/meetings', () => {
  it('비로그인 상태면 401 UNAUTHENTICATED', async () => {
    const res = await request(app).post('/api/meetings').send(validFlashBody);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('flash 모임을 정상 등록하면 capacity가 저장되고 endAt은 null이 된다', async () => {
    const agent = await loginAgent();
    const res = await agent.post('/api/meetings').send(validFlashBody);

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.type).toBe('flash');
    expect(res.body.data.title).toBe('오늘 저녁 풋살 4명');
    expect(res.body.data.capacity).toBe(4);
    expect(res.body.data.endAt).toBeNull();
    expect(res.body.data.status).toBe('recruiting');
  });

  it('flash 모임에 capacity가 없으면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent();
    const { capacity, ...noCapacity } = validFlashBody;
    const res = await agent.post('/api/meetings').send(noCapacity);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('small 모임을 정상 등록하면 capacity는 null로 강제되고 endAt이 저장된다', async () => {
    const agent = await loginAgent('host-small');
    const res = await agent
      .post('/api/meetings')
      .send({ ...validSmallBody, capacity: 99 }); // capacity를 줘도 무시돼야 함

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('small');
    expect(res.body.data.capacity).toBeNull();
    expect(res.body.data.endAt).not.toBeNull();
  });

  it('small 모임에 endAt이 없으면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent('host-small2');
    const { endAt, ...noEndAt } = validSmallBody;
    const res = await agent.post('/api/meetings').send(noEndAt);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('openChatUrl이 카카오 오픈채팅 형식이 아니면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent('host-url');
    const res = await agent
      .post('/api/meetings')
      .send({ ...validFlashBody, openChatUrl: 'https://evil.com/o/abc' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('필수 항목(title)이 없으면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent('host-title');
    const { title, ...noTitle } = validFlashBody;
    const res = await agent.post('/api/meetings').send(noTitle);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('regionSigungu가 없으면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent('host-region');
    const { regionSigungu, ...noSigungu } = validFlashBody;
    const res = await agent.post('/api/meetings').send(noSigungu);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // 길이 검증이 없으면 Postgres가 "character varying(100) 자료형에 너무 긴 자료를..."로
  // 거절하고, 그게 500 + DB 에러 원문 노출로 나간다(실제로 재현됨). 컬럼 제약과 같은
  // 한도를 앱에서 먼저 확인해 400으로 돌려줘야 한다.
  it('title이 100자를 넘으면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent('host-len1');
    const res = await agent.post('/api/meetings').send({ ...validFlashBody, title: '가'.repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('title이 정확히 100자면 정상 등록된다(경계값)', async () => {
    const agent = await loginAgent('host-len2');
    const res = await agent.post('/api/meetings').send({ ...validFlashBody, title: '가'.repeat(100) });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toHaveLength(100);
  });

  // 길이는 JS의 .length(UTF-16 코드유닛)가 아니라 문자 수로 세야 한다. 이모지 같은
  // 서로게이트 페어는 JS에서 2로 세지만 Postgres varchar(n)은 1로 센다. 코드유닛으로 세면
  // 사용자가 보기엔 60자인 제목이 "100자 초과"로 거절된다(실제로 재현됨).
  it('이모지 60자 제목은 등록된다(varchar(100)에 들어가므로)', async () => {
    const agent = await loginAgent('host-emoji1');
    const res = await agent.post('/api/meetings').send({ ...validFlashBody, title: '🎉'.repeat(60) });

    expect(res.status).toBe(201);
  });

  it('이모지 101자 제목은 400(문자 수로 세도 한도를 넘으므로)', async () => {
    const agent = await loginAgent('host-emoji2');
    const res = await agent.post('/api/meetings').send({ ...validFlashBody, title: '🎉'.repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('category가 30자를 넘으면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent('host-len3');
    const res = await agent.post('/api/meetings').send({ ...validFlashBody, category: '가'.repeat(31) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('지역 값이 20자를 넘으면 400 VALIDATION_ERROR', async () => {
    const agent = await loginAgent('host-len4');
    const res = await agent.post('/api/meetings').send({ ...validFlashBody, regionSigungu: '가'.repeat(21) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('regionEupmyeondong(선택 항목)도 20자를 넘으면 400', async () => {
    const agent = await loginAgent('host-len5');
    const res = await agent
      .post('/api/meetings')
      .send({ ...validFlashBody, regionEupmyeondong: '가'.repeat(21) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
