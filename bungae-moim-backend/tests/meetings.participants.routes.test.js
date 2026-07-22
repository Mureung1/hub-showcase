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

describe('PATCH /api/meetings/:id/participants/:userId', () => {
  it('비로그인은 401', async () => {
    const host = await createUser('r-h0');
    const meetingId = await insertMeeting(host);
    const a = await createUser('r-a0');
    await insertParticipant(meetingId, a, 'pending');

    const res = await request(app)
      .patch(`/api/meetings/${meetingId}/participants/${a}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(401);
  });

  it('모임장이 아니면 403 FORBIDDEN', async () => {
    const host = await createUser('r-h1');
    const meetingId = await insertMeeting(host);
    const { agent, userId } = await loginAgent('r-u1');
    await insertParticipant(meetingId, userId, 'pending');

    const res = await agent
      .patch(`/api/meetings/${meetingId}/participants/${userId}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('flash 모임에서는 승인할 수 없다(400)', async () => {
    const { agent, userId: hostId } = await loginAgent('r-h2', '모임장');
    const meetingId = await insertMeeting(hostId, { type: 'flash', capacity: 4, endAt: null });
    const a = await createUser('r-a2');
    await insertParticipant(meetingId, a, 'pending');

    const res = await agent
      .patch(`/api/meetings/${meetingId}/participants/${a}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('status가 없으면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('r-h3', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('r-a3');
    await insertParticipant(meetingId, a, 'pending');

    const res = await agent.patch(`/api/meetings/${meetingId}/participants/${a}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('status가 approved/rejected가 아니면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('r-h4', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('r-a4');
    await insertParticipant(meetingId, a, 'pending');

    const res = await agent
      .patch(`/api/meetings/${meetingId}/participants/${a}`)
      .send({ status: 'pending' });
    expect(res.status).toBe(400);
  });

  it('pending을 승인하면 approved가 되고 responded_at이 채워진다', async () => {
    const { agent, userId: hostId } = await loginAgent('r-h5', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('r-a5');
    await insertParticipant(meetingId, a, 'pending');

    const res = await agent
      .patch(`/api/meetings/${meetingId}/participants/${a}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.userId).toBe(a);

    const { rows } = await pool.query(
      'SELECT status, responded_at FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, a]
    );
    expect(rows[0].status).toBe('approved');
    expect(rows[0].responded_at).not.toBeNull();
  });

  it('pending을 거절하면 rejected가 된다', async () => {
    const { agent, userId: hostId } = await loginAgent('r-h6', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('r-a6');
    await insertParticipant(meetingId, a, 'pending');

    const res = await agent
      .patch(`/api/meetings/${meetingId}/participants/${a}`)
      .send({ status: 'rejected' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  it('이미 처리된 신청은 다시 처리할 수 없다(400)', async () => {
    const { agent, userId: hostId } = await loginAgent('r-h7', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('r-a7');
    await insertParticipant(meetingId, a, 'approved');

    const res = await agent
      .patch(`/api/meetings/${meetingId}/participants/${a}`)
      .send({ status: 'rejected' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('신청한 적 없는 사용자는 404', async () => {
    const { agent, userId: hostId } = await loginAgent('r-h8', '모임장');
    const meetingId = await insertMeeting(hostId);
    const a = await createUser('r-a8');

    const res = await agent
      .patch(`/api/meetings/${meetingId}/participants/${a}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(404);
  });
});

describe('승인/거절이 다른 화면에 미치는 영향', () => {
  it('승인받은 신청자에게 오픈채팅 링크가 열리고 confirmedCount가 1 오른다', async () => {
    const hostLogin = await loginAgent('i-h1', '모임장');
    const meetingId = await insertMeeting(hostLogin.userId);
    const applicant = await loginAgent('i-a1', '신청자');
    await pool.query('UPDATE users SET birth_date = $1 WHERE id = $2', ['1990-01-01', applicant.userId]);

    // 신청 → 소모임이므로 pending. 아직 오픈채팅은 안 보인다.
    await applicant.agent.post(`/api/meetings/${meetingId}/apply`);
    const before = await applicant.agent.get(`/api/meetings/${meetingId}`);
    expect(before.body.data.myParticipation.status).toBe('pending');
    expect(before.body.data.openChatUrl).toBeUndefined();
    expect(before.body.data.confirmedCount).toBe(0);

    // 모임장이 승인.
    const patched = await hostLogin.agent
      .patch(`/api/meetings/${meetingId}/participants/${applicant.userId}`)
      .send({ status: 'approved' });
    expect(patched.status).toBe(200);

    // 이제 링크가 보이고 확정 인원이 1이다.
    const after = await applicant.agent.get(`/api/meetings/${meetingId}`);
    expect(after.body.data.myParticipation.status).toBe('approved');
    expect(after.body.data.openChatUrl).toBe('https://open.kakao.com/o/test');
    expect(after.body.data.confirmedCount).toBe(1);
  });

  it('F4로 거절당하면 재신청할 수 없다', async () => {
    const hostLogin = await loginAgent('i-h2', '모임장');
    const meetingId = await insertMeeting(hostLogin.userId);
    const applicant = await loginAgent('i-a2', '신청자');
    await pool.query('UPDATE users SET birth_date = $1 WHERE id = $2', ['1990-01-01', applicant.userId]);

    await applicant.agent.post(`/api/meetings/${meetingId}/apply`);
    await hostLogin.agent
      .patch(`/api/meetings/${meetingId}/participants/${applicant.userId}`)
      .send({ status: 'rejected' });

    // 거절은 재신청 불가(F1 규칙). 거절 경로가 실제로 rejected 상태를 쓰는지 확인하는 것이 목적이다.
    const retry = await applicant.agent.post(`/api/meetings/${meetingId}/apply`);
    expect(retry.status).toBe(400);

    const detail = await applicant.agent.get(`/api/meetings/${meetingId}`);
    expect(detail.body.data.canApply).toBe(false);
    expect(detail.body.data.blockReason).toBe('REJECTED');
  });
});
