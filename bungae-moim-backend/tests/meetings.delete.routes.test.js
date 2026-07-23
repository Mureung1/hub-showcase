// DELETE /api/meetings/:id — 모임 취소(E5).
// 핵심: 모임장만, 참여자 전원 cancelled, 신뢰도 불변, 이미 취소는 400.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

async function loginAgent(providerId, nickname = '모임장') {
  exchangeGoogleCode.mockResolvedValueOnce({ providerId, email: `${providerId}@test.com`, nickname });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/google').send({ code: 'code' });
  return { agent, userId: Number(res.body.data.user.id) };
}

async function createUser(providerId, nickname = '유저', trustScore = 50.0) {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname, trust_score)
     VALUES ('google', $1, $2, $3, $4) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname, trustScore]
  );
  return Number(rows[0].id);
}

async function insertMeeting(hostId, overrides = {}) {
  const m = {
    type: 'small', title: '취소 테스트', category: '운동', description: '설명',
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

describe('DELETE /api/meetings/:id', () => {
  it('비로그인은 401', async () => {
    const host = await createUser('d-h0');
    const meetingId = await insertMeeting(host);
    const res = await request(app).delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(401);
  });

  it('모임장이 아니면 403', async () => {
    const host = await createUser('d-h1');
    const meetingId = await insertMeeting(host);
    const { agent } = await loginAgent('d-u1');
    const res = await agent.delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('없는 모임은 404', async () => {
    const { agent } = await loginAgent('d-u2');
    const res = await agent.delete('/api/meetings/999999');
    expect(res.status).toBe(404);
  });

  it(':id가 숫자가 아니면 404', async () => {
    const { agent } = await loginAgent('d-u3');
    const res = await agent.delete('/api/meetings/1abc');
    expect(res.status).toBe(404);
  });

  it('모임장이 취소하면 200, 참여자 전원 cancelled', async () => {
    const { agent, userId: hostId } = await loginAgent('d-h4');
    const meetingId = await insertMeeting(hostId);
    const applicant = await createUser('d-a4');
    const pendingApplicant = await createUser('d-a4p');
    const rejectedApplicant = await createUser('d-a4r');
    await insertParticipant(meetingId, applicant, 'approved');
    await insertParticipant(meetingId, pendingApplicant, 'pending');
    await insertParticipant(meetingId, rejectedApplicant, 'rejected');

    const res = await agent.delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');

    const meeting = await pool.query('SELECT status FROM meetings WHERE id = $1', [meetingId]);
    expect(meeting.rows[0].status).toBe('cancelled');
    const part = await pool.query(
      'SELECT status FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, applicant]
    );
    expect(part.rows[0].status).toBe('cancelled');

    const allParts = await pool.query(
      'SELECT user_id, status FROM meeting_participants WHERE meeting_id = $1 ORDER BY user_id',
      [meetingId]
    );
    expect(allParts.rows.every((r) => r.status === 'cancelled')).toBe(true);
    expect(allParts.rows.length).toBe(3);
  });

  it('취소해도 참여자 신뢰도는 변하지 않는다', async () => {
    const { agent, userId: hostId } = await loginAgent('d-h5');
    const meetingId = await insertMeeting(hostId);
    const applicant = await createUser('d-a5', '확정자', 50.0);
    await insertParticipant(meetingId, applicant, 'approved');

    await agent.delete(`/api/meetings/${meetingId}`);

    const user = await pool.query('SELECT trust_score FROM users WHERE id = $1', [applicant]);
    expect(Number(user.rows[0].trust_score)).toBe(50);
  });

  it('이미 취소된 모임은 400', async () => {
    const { agent, userId: hostId } = await loginAgent('d-h6');
    const meetingId = await insertMeeting(hostId, { status: 'cancelled' });
    const res = await agent.delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
