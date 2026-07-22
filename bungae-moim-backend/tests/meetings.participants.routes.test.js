// GET /api/meetings/:id/participants — 신청자 목록(F3).
// 핵심: 모임장만 조회, 모든 상태 포함, appliedAt 오름차순, bigint/numeric의 숫자 정규화.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

async function loginAgent(providerId, nickname = '신청자') {
  exchangeGoogleCode.mockResolvedValueOnce({ providerId, email: `${providerId}@test.com`, nickname });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/google').send({ code: 'code' });
  return { agent, userId: Number(res.body.data.user.id) };
}

async function createUser(providerId, nickname = '호스트') {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname)
     VALUES ('google', $1, $2, $3) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname]
  );
  return Number(rows[0].id);
}

async function insertMeeting(hostId, overrides = {}) {
  const m = {
    type: 'small', title: '승인 테스트', category: '운동', description: '설명',
    regionSido: '서울특별시', regionSigungu: '강남구', regionEupmyeondong: '역삼동',
    startAt: '2030-01-01T10:00:00+09:00', endAt: '2030-01-01T12:00:00+09:00',
    capacity: null, adultOnly: false,
    openChatUrl: 'https://open.kakao.com/o/test', status: 'recruiting', ...overrides,
  };
  const { rows } = await pool.query(
    `INSERT INTO meetings (host_id, type, title, category, description, region_sido, region_sigungu,
       region_eupmyeondong, start_at, end_at, capacity, adult_only, open_chat_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
    [hostId, m.type, m.title, m.category, m.description, m.regionSido, m.regionSigungu,
     m.regionEupmyeondong, m.startAt, m.endAt, m.capacity, m.adultOnly, m.openChatUrl, m.status]
  );
  return Number(rows[0].id);
}

// appliedAt을 받는 이유: 지정하지 않으면 DEFAULT now()로 들어가 연달아 INSERT한 행들의
// 시각이 사실상 같아진다. 그러면 INSERT 순서와 정렬 결과가 우연히 일치해 ORDER BY가
// 아예 없는 구현도 정렬 테스트를 통과한다(실제로 확인함).
async function insertParticipant(meetingId, userId, status, appliedAt = null) {
  if (appliedAt === null) {
    await pool.query(
      'INSERT INTO meeting_participants (meeting_id, user_id, status) VALUES ($1,$2,$3)',
      [meetingId, userId, status]
    );
    return;
  }
  await pool.query(
    'INSERT INTO meeting_participants (meeting_id, user_id, status, applied_at) VALUES ($1,$2,$3,$4)',
    [meetingId, userId, status, appliedAt]
  );
}

describe('GET /api/meetings/:id/participants', () => {
  it('비로그인은 401', async () => {
    const host = await createUser('p-h0');
    const meetingId = await insertMeeting(host);
    const res = await request(app).get(`/api/meetings/${meetingId}/participants`);
    expect(res.status).toBe(401);
  });

  it('모임장이 아니면 403 FORBIDDEN', async () => {
    const host = await createUser('p-h1');
    const meetingId = await insertMeeting(host);
    const { agent } = await loginAgent('p-u1');

    const res = await agent.get(`/api/meetings/${meetingId}/participants`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('없는 모임은 404', async () => {
    const { agent } = await loginAgent('p-u2');
    const res = await agent.get('/api/meetings/999999/participants');
    expect(res.status).toBe(404);
  });

  it(':id가 숫자가 아니면 404', async () => {
    const { agent } = await loginAgent('p-u3');
    const res = await agent.get('/api/meetings/1abc/participants');
    expect(res.status).toBe(404);
  });

  it('신청자가 없으면 빈 배열을 준다', async () => {
    const { agent, userId } = await loginAgent('p-h4');
    const meetingId = await insertMeeting(userId);

    const res = await agent.get(`/api/meetings/${meetingId}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it('모든 상태의 신청자를 appliedAt 오름차순으로 준다', async () => {
    const { agent, userId: hostId } = await loginAgent('p-h5', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('p-a5', '가');
    const b = await createUser('p-b5', '나');
    const c = await createUser('p-c5', '다');
    const d = await createUser('p-d5', '라');

    // 나중에 INSERT한 행일수록 더 이른 applied_at을 갖게 해서, INSERT 순서(=id 순)와
    // 정렬 결과가 반드시 달라지게 만든다. ORDER BY가 없으면 이 테스트는 실패한다.
    await insertParticipant(meetingId, a, 'pending', '2026-07-20 10:00:00');
    await insertParticipant(meetingId, b, 'approved', '2026-07-19 10:00:00');
    await insertParticipant(meetingId, c, 'rejected', '2026-07-18 10:00:00');
    await insertParticipant(meetingId, d, 'cancelled', '2026-07-17 10:00:00');

    const res = await agent.get(`/api/meetings/${meetingId}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((p) => p.nickname)).toEqual(['라', '다', '나', '가']);
    expect(res.body.data.items.map((p) => p.status)).toEqual(['cancelled', 'rejected', 'approved', 'pending']);
  });

  it('userId와 trustScore가 문자열이 아니라 숫자로 온다', async () => {
    // bigint(user_id)와 numeric(trust_score)은 pg가 문자열로 준다. Number() 정규화가
    // 빠지면 FE의 TrustBadge가 score.toFixed(1)에서 TypeError로 죽는다.
    const { agent, userId: hostId } = await loginAgent('p-h6', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('p-a6', '가');
    await insertParticipant(meetingId, a, 'pending');

    const res = await agent.get(`/api/meetings/${meetingId}/participants`);
    const item = res.body.data.items[0];
    expect(item.userId).toBe(a);
    expect(typeof item.userId).toBe('number');
    expect(typeof item.trustScore).toBe('number');
    expect(item.trustScore).toBe(50);
  });

  it('flash 모임도 모임장이면 조회할 수 있다', async () => {
    const { agent, userId: hostId } = await loginAgent('p-h7', '모임장');
    const meetingId = await insertMeeting(hostId, { type: 'flash', capacity: 4, endAt: null });
    const a = await createUser('p-a7', '가');
    await insertParticipant(meetingId, a, 'confirmed');

    const res = await agent.get(`/api/meetings/${meetingId}/participants`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].status).toBe('confirmed');
  });
});
