// GET /api/users/me/hosted-meetings — 내가 등록한 모임(G1).
// 핵심: applicantCount(활성 전체)·pendingCount(대기) 집계, created_at DESC, 남의 모임 제외.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => { await pool.end(); });

async function loginAgent(providerId, nickname = '모임장') {
  exchangeGoogleCode.mockResolvedValueOnce({ providerId, email: `${providerId}@test.com`, nickname });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/google').send({ code: 'code' });
  return { agent, userId: Number(res.body.data.user.id) };
}
async function createUser(providerId, nickname = '유저') {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname) VALUES ('google',$1,$2,$3) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname]
  );
  return Number(rows[0].id);
}
async function insertMeeting(hostId, overrides = {}) {
  const m = {
    type: 'small', title: '내 모임', category: '운동', description: '설명',
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
async function insertParticipant(meetingId, userId, status) {
  await pool.query(
    'INSERT INTO meeting_participants (meeting_id, user_id, status) VALUES ($1,$2,$3)',
    [meetingId, userId, status]
  );
}

describe('GET /api/users/me/hosted-meetings', () => {
  it('비로그인은 401', async () => {
    const res = await request(app).get('/api/users/me/hosted-meetings');
    expect(res.status).toBe(401);
  });

  it('applicantCount는 pending+approved+confirmed, pendingCount는 pending만 (취소·거절 제외)', async () => {
    const { agent, userId: hostId } = await loginAgent('h-h1');
    const meetingId = await insertMeeting(hostId);
    for (const [i, status] of [['a', 'pending'], ['b', 'approved'], ['c', 'confirmed'],
                               ['d', 'rejected'], ['e', 'cancelled']]) {
      const u = await createUser(`h-p${i}`);
      await insertParticipant(meetingId, u, status);
    }
    const res = await agent.get('/api/users/me/hosted-meetings');
    expect(res.status).toBe(200);
    const item = res.body.data.items.find((it) => it.id === meetingId);
    expect(item.applicantCount).toBe(3);
    expect(item.pendingCount).toBe(1);
  });

  it('취소된 내 모임도 포함하고 남의 모임은 제외한다', async () => {
    const { agent, userId: hostId } = await loginAgent('h-h2');
    const mine = await insertMeeting(hostId, { status: 'cancelled' });
    const otherHost = await createUser('h-h2b');
    const theirs = await insertMeeting(otherHost);
    const res = await agent.get('/api/users/me/hosted-meetings');
    const ids = res.body.data.items.map((it) => it.id);
    expect(ids).toContain(mine);
    expect(ids).not.toContain(theirs);
  });

  it('created_at 내림차순으로 정렬한다', async () => {
    const { agent, userId: hostId } = await loginAgent('h-h3');
    const first = await insertMeeting(hostId, { title: '먼저' });
    const second = await insertMeeting(hostId, { title: '나중' });
    const res = await agent.get('/api/users/me/hosted-meetings');
    const ids = res.body.data.items.map((it) => it.id);
    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first));
  });
});
