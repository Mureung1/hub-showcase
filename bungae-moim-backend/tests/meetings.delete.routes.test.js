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

  // 종료된 모임은 취소할 수 없다(F2와 동일 가드·동일 에러 코드). 신뢰도 상호 평가 도입 후
  // 이게 없으면: 모임 종료 → 모임장이 참여자를 "안 왔음"으로 평가 → 모임장이 모임을 취소해
  // status를 cancelled로 만들면 평가 대상 목록·제출 API 둘 다 취소된 모임을 걸러내
  // 참여자가 반박 평가를 영영 제출할 수 없는데, 이미 반영된 감점은 그대로 남는다.
  it('종료된 모임은 취소할 수 없다(400) — 평가 반박 경로를 지우는 것을 막는다', async () => {
    const { agent, userId: hostId } = await loginAgent('d-h7');
    const meetingId = await insertMeeting(hostId, {
      startAt: '2020-01-01T10:00:00+09:00', endAt: '2020-01-01T12:00:00+09:00',
    });
    const res = await agent.delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const meeting = await pool.query('SELECT status FROM meetings WHERE id = $1', [meetingId]);
    expect(meeting.rows[0].status).toBe('recruiting');
  });

  it('시작은 지났지만 아직 끝나지 않은 소모임(end_at 미래)은 취소할 수 있다', async () => {
    const { agent, userId: hostId } = await loginAgent('d-h8');
    const meetingId = await insertMeeting(hostId, {
      startAt: '2020-01-01T10:00:00+09:00', endAt: '2099-01-01T10:00:00+09:00',
    });
    const res = await agent.delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
  });
});

describe('모임 취소 알림(C)', () => {
  it('취소 직전 활성 참여자에게만 알림이 간다', async () => {
    const { agent, userId: hostId } = await loginAgent('n-e5-h1', '모임장');
    const meetingId = await insertMeeting(hostId);
    const pending = await createUser('n-e5-p1', '대기');
    const approved = await createUser('n-e5-a1', '승인');
    const rejectedUser = await createUser('n-e5-r1', '거절');
    const cancelledUser = await createUser('n-e5-c1', '취소');
    await insertParticipant(meetingId, pending, 'pending');
    await insertParticipant(meetingId, approved, 'approved');
    await insertParticipant(meetingId, rejectedUser, 'rejected');
    await insertParticipant(meetingId, cancelledUser, 'cancelled');

    const res = await agent.delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);

    const { rows } = await pool.query(
      'SELECT user_id, type FROM notifications ORDER BY user_id'
    );
    expect(rows.map((r) => Number(r.user_id)).sort((a, b) => a - b)).toEqual(
      [pending, approved].sort((a, b) => a - b)
    );
    expect(rows.every((r) => r.type === 'meeting_cancelled')).toBe(true);
  });

  it('참여자가 없으면 알림도 없다', async () => {
    const { agent, userId: hostId } = await loginAgent('n-e5-h2', '모임장');
    const meetingId = await insertMeeting(hostId);

    const res = await agent.delete(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM notifications');
    expect(rows[0].n).toBe(0);
  });
});
