// DELETE /api/meetings/:id/apply — 참여/신청 취소(F2).
// 핵심: confirmed 취소 시 감점+재오픈, pending 취소는 무감점, 이중취소는 감점 안 함.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

async function loginAgent(providerId, nickname = '취소자') {
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
    type: 'flash', capacity: 2, status: 'recruiting', endAt: null,
    startAt: '2030-01-01T10:00:00+09:00', ...overrides,
  };
  const { rows } = await pool.query(
    `INSERT INTO meetings (host_id, type, title, category, description, region_sido, region_sigungu,
       region_eupmyeondong, start_at, end_at, capacity, adult_only, open_chat_url, status)
     VALUES ($1,$2,'취소테스트','운동','설명','서울특별시','강남구','역삼동',$3,$4,$5,false,'https://open.kakao.com/o/t',$6)
     RETURNING id`,
    [hostId, m.type, m.startAt, m.endAt, m.capacity, m.status]
  );
  return Number(rows[0].id);
}

async function insertParticipant(meetingId, userId, status) {
  await pool.query(
    'INSERT INTO meeting_participants (meeting_id, user_id, status) VALUES ($1,$2,$3)',
    [meetingId, userId, status]
  );
}

async function trustScore(userId) {
  const { rows } = await pool.query('SELECT trust_score FROM users WHERE id = $1', [userId]);
  return Number(rows[0].trust_score);
}
async function meetingStatus(meetingId) {
  const { rows } = await pool.query('SELECT status FROM meetings WHERE id = $1', [meetingId]);
  return rows[0].status;
}
async function participantStatus(meetingId, userId) {
  const { rows } = await pool.query(
    'SELECT status FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
    [meetingId, userId]
  );
  return rows[0].status;
}

describe('DELETE /api/meetings/:id/apply', () => {
  it('취소할 신청이 없으면 404', async () => {
    const host = await createUser('cancel-h0');
    const meetingId = await insertMeeting(host);
    const { agent } = await loginAgent('cancel-u0');
    const res = await agent.delete(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(404);
  });

  it('confirmed 취소 시 신뢰도가 3점 깎이고 flash가 재오픈된다', async () => {
    const host = await createUser('cancel-h1');
    const meetingId = await insertMeeting(host, { capacity: 1, status: 'closed' });
    const { agent, userId } = await loginAgent('cancel-u1');
    await insertParticipant(meetingId, userId, 'confirmed');

    const before = await trustScore(userId);
    const res = await agent.delete(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(200);
    expect(await trustScore(userId)).toBe(before - 3);
    expect(await meetingStatus(meetingId)).toBe('recruiting');
    expect(await participantStatus(meetingId, userId)).toBe('cancelled');
  });

  it('pending 취소는 감점이 없다', async () => {
    const host = await createUser('cancel-h2');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-12-31T10:00:00+09:00' });
    const { agent, userId } = await loginAgent('cancel-u2');
    await insertParticipant(meetingId, userId, 'pending');

    const before = await trustScore(userId);
    await agent.delete(`/api/meetings/${meetingId}/apply`);
    expect(await trustScore(userId)).toBe(before);
  });

  it('이미 취소된 걸 다시 취소해도 감점되지 않는다(404, 신뢰도 불변)', async () => {
    const host = await createUser('cancel-h3');
    const meetingId = await insertMeeting(host);
    const { agent, userId } = await loginAgent('cancel-u3');
    await insertParticipant(meetingId, userId, 'confirmed');

    await agent.delete(`/api/meetings/${meetingId}/apply`); // 첫 취소(-3)
    const afterFirst = await trustScore(userId);
    const res = await agent.delete(`/api/meetings/${meetingId}/apply`); // 이중 취소
    expect(res.status).toBe(404);
    expect(await trustScore(userId)).toBe(afterFirst); // 더 안 깎임
  });
});
