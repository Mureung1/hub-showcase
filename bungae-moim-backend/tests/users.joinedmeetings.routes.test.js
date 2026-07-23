// GET /api/users/me/joined-meetings — 내가 신청/참여한 모임(G2).
// 핵심: 모든 상태 이력 포함, meeting.host.nickname, applied_at DESC.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => { await pool.end(); });

async function loginAgent(providerId, nickname = '참여자') {
  exchangeGoogleCode.mockResolvedValueOnce({ providerId, email: `${providerId}@test.com`, nickname });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/google').send({ code: 'code' });
  return { agent, userId: Number(res.body.data.user.id) };
}
async function createUser(providerId, nickname = '호스트') {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname) VALUES ('google',$1,$2,$3) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname]
  );
  return Number(rows[0].id);
}
async function insertMeeting(hostId, overrides = {}) {
  const m = {
    type: 'small', title: '참여 대상', category: '운동', description: '설명',
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
async function insertParticipant(meetingId, userId, status, appliedAt) {
  await pool.query(
    'INSERT INTO meeting_participants (meeting_id, user_id, status, applied_at) VALUES ($1,$2,$3,$4)',
    [meetingId, userId, status, appliedAt]
  );
}

describe('GET /api/users/me/joined-meetings', () => {
  it('비로그인은 401', async () => {
    const res = await request(app).get('/api/users/me/joined-meetings');
    expect(res.status).toBe(401);
  });

  it('거절·취소 이력까지 모두 포함하고 host.nickname을 준다', async () => {
    const host = await createUser('j-host', '길동');
    const { agent, userId } = await loginAgent('j-me');
    const m1 = await insertMeeting(host, { title: '대기중' });
    const m2 = await insertMeeting(host, { title: '거절됨' });
    const m3 = await insertMeeting(host, { title: '취소됨' });
    await insertParticipant(m1, userId, 'pending', '2026-07-20T10:00:00+09:00');
    await insertParticipant(m2, userId, 'rejected', '2026-07-21T10:00:00+09:00');
    await insertParticipant(m3, userId, 'cancelled', '2026-07-19T10:00:00+09:00');

    const res = await agent.get('/api/users/me/joined-meetings');
    expect(res.status).toBe(200);
    const statuses = res.body.data.items.map((it) => it.status).sort();
    expect(statuses).toEqual(['cancelled', 'pending', 'rejected']);
    const one = res.body.data.items.find((it) => it.meeting.id === m1);
    expect(one.meeting.host.nickname).toBe('길동');
    expect(one.meeting.title).toBe('대기중');
  });

  it('applied_at 내림차순으로 정렬한다', async () => {
    const host = await createUser('j-host2');
    const { agent, userId } = await loginAgent('j-me2');
    const older = await insertMeeting(host, { title: '오래된' });
    const newer = await insertMeeting(host, { title: '최근' });
    await insertParticipant(older, userId, 'confirmed', '2026-07-10T10:00:00+09:00');
    await insertParticipant(newer, userId, 'confirmed', '2026-07-22T10:00:00+09:00');

    const res = await agent.get('/api/users/me/joined-meetings');
    const ids = res.body.data.items.map((it) => it.meeting.id);
    expect(ids.indexOf(newer)).toBeLessThan(ids.indexOf(older));
  });
});
