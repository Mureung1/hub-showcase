// POST /api/meetings/:id/apply — 참여 신청(F1).
// 핵심: flash 즉시 확정/정원 마감, small pending, 성인 차단, 중복/재신청, 동시 신청 초과 방지.
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

async function setBirthDate(userId, birthDate) {
  await pool.query('UPDATE users SET birth_date = $1 WHERE id = $2', [birthDate, userId]);
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
    type: 'flash', title: '신청 테스트', category: '운동', description: '설명',
    regionSido: '서울특별시', regionSigungu: '강남구', regionEupmyeondong: '역삼동',
    startAt: '2030-01-01T10:00:00+09:00', endAt: null, capacity: 2, adultOnly: false,
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

async function meetingStatus(meetingId) {
  const { rows } = await pool.query('SELECT status FROM meetings WHERE id = $1', [meetingId]);
  return rows[0].status;
}

describe('POST /api/meetings/:id/apply', () => {
  it('비로그인은 401', async () => {
    const host = await createUser('apply-h0');
    const meetingId = await insertMeeting(host);
    const res = await request(app).post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(401);
  });

  it('flash 신청은 즉시 confirmed가 된다', async () => {
    const host = await createUser('apply-h1');
    const meetingId = await insertMeeting(host);
    const { agent, userId } = await loginAgent('apply-u1');
    await setBirthDate(userId, '1990-01-01');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('confirmed');
  });

  it('마지막 자리를 채우면 모임이 closed가 된다', async () => {
    const host = await createUser('apply-h2');
    const meetingId = await insertMeeting(host, { capacity: 1 });
    const { agent, userId } = await loginAgent('apply-u2');
    await setBirthDate(userId, '1990-01-01');

    await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(await meetingStatus(meetingId)).toBe('closed');
  });

  it('정원이 찬 모임에 신청하면 400', async () => {
    const host = await createUser('apply-h3');
    const meetingId = await insertMeeting(host, { capacity: 1, status: 'closed' });
    const filler = await createUser('apply-filler');
    await insertParticipant(meetingId, filler, 'confirmed');
    const { agent, userId } = await loginAgent('apply-u3');
    await setBirthDate(userId, '1990-01-01');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(400);
  });

  it('small 신청은 pending이 된다', async () => {
    const host = await createUser('apply-h4');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-12-31T10:00:00+09:00' });
    const { agent, userId } = await loginAgent('apply-u4');
    await setBirthDate(userId, '1990-01-01');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.body.data.status).toBe('pending');
  });

  it('성인 전용에 생년월일 없는 계정은 403', async () => {
    const host = await createUser('apply-h5');
    const meetingId = await insertMeeting(host, { adultOnly: true });
    const { agent } = await loginAgent('apply-u5'); // birthDate 안 넣음

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(403);
  });

  it('성인 전용에 미성년은 403', async () => {
    const host = await createUser('apply-h6');
    const meetingId = await insertMeeting(host, { adultOnly: true });
    const { agent, userId } = await loginAgent('apply-u6');
    await setBirthDate(userId, '2015-01-01');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(403);
  });

  it('자기 모임에는 신청할 수 없다(400)', async () => {
    const { agent, userId } = await loginAgent('apply-self');
    await setBirthDate(userId, '1990-01-01');
    const meetingId = await insertMeeting(userId);

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(400);
  });

  it('중복 신청은 400', async () => {
    const host = await createUser('apply-h7');
    const meetingId = await insertMeeting(host);
    const { agent, userId } = await loginAgent('apply-u7');
    await setBirthDate(userId, '1990-01-01');

    await agent.post(`/api/meetings/${meetingId}/apply`);
    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(400);
  });

  it('내가 취소한 뒤에는 재신청할 수 있다', async () => {
    const host = await createUser('apply-h8');
    const meetingId = await insertMeeting(host);
    const { agent, userId } = await loginAgent('apply-u8');
    await setBirthDate(userId, '1990-01-01');
    await insertParticipant(meetingId, userId, 'cancelled');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('confirmed');
  });

  it('거절당한 뒤에는 재신청할 수 없다(400)', async () => {
    const host = await createUser('apply-h9');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-12-31T10:00:00+09:00' });
    const { agent, userId } = await loginAgent('apply-u9');
    await setBirthDate(userId, '1990-01-01');
    await insertParticipant(meetingId, userId, 'rejected');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(400);
  });

  it('정원 1자리에 동시 신청이 몰려도 딱 한 명만 확정된다', async () => {
    const host = await createUser('apply-h10');
    const meetingId = await insertMeeting(host, { capacity: 1 });
    const a = await loginAgent('apply-race-a');
    const b = await loginAgent('apply-race-b');
    await setBirthDate(a.userId, '1990-01-01');
    await setBirthDate(b.userId, '1990-01-01');

    const [ra, rb] = await Promise.all([
      a.agent.post(`/api/meetings/${meetingId}/apply`),
      b.agent.post(`/api/meetings/${meetingId}/apply`),
    ]);
    const statuses = [ra.status, rb.status].sort();
    expect(statuses).toEqual([201, 400]); // 하나는 성공, 하나는 정원 마감

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM meeting_participants
        WHERE meeting_id = $1 AND status = 'confirmed'`,
      [meetingId]
    );
    expect(rows[0].c).toBe(1);
  });

  it('질문이 있는 소모임은 답변 없이 신청하면 400 VALIDATION_ERROR', async () => {
    const host = await createUser('ans-h1');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-01-01T12:00:00+09:00' });
    await pool.query('UPDATE meetings SET apply_question = $1 WHERE id = $2', ['왜 참여하나요', meetingId]);
    const { agent } = await loginAgent('ans-u1');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('답변을 보내면 저장된다', async () => {
    const host = await createUser('ans-h2');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-01-01T12:00:00+09:00' });
    await pool.query('UPDATE meetings SET apply_question = $1 WHERE id = $2', ['왜 참여하나요', meetingId]);
    const { agent, userId } = await loginAgent('ans-u2');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`).send({ answer: '책을 좋아해서요' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query(
      'SELECT apply_answer FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    expect(rows[0].apply_answer).toBe('책을 좋아해서요');
  });

  it('질문이 없는 모임에 답변을 보내면 무시하고 null로 저장한다', async () => {
    const host = await createUser('ans-h3');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-01-01T12:00:00+09:00' });
    const { agent, userId } = await loginAgent('ans-u3');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`).send({ answer: '무시돼야 한다' });
    expect(res.status).toBe(201);
    const { rows } = await pool.query(
      'SELECT apply_answer FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    expect(rows[0].apply_answer).toBeNull();
  });

  it('취소 후 재신청하면 답변이 새 값으로 갱신된다', async () => {
    const host = await createUser('ans-h4');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-01-01T12:00:00+09:00' });
    await pool.query('UPDATE meetings SET apply_question = $1 WHERE id = $2', ['왜 참여하나요', meetingId]);
    const { agent, userId } = await loginAgent('ans-u4');

    await agent.post(`/api/meetings/${meetingId}/apply`).send({ answer: '첫 번째 답변' });
    await agent.delete(`/api/meetings/${meetingId}/apply`);
    const res = await agent.post(`/api/meetings/${meetingId}/apply`).send({ answer: '두 번째 답변' });

    expect(res.status).toBe(201);
    const { rows } = await pool.query(
      'SELECT apply_answer FROM meeting_participants WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    expect(rows[0].apply_answer).toBe('두 번째 답변');
  });

  it('공백만 있는 답변은 400 VALIDATION_ERROR(trim 후 빈 문자열)', async () => {
    const host = await createUser('ans-h5');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-01-01T12:00:00+09:00' });
    await pool.query('UPDATE meetings SET apply_question = $1 WHERE id = $2', ['왜 참여하나요', meetingId]);
    const { agent } = await loginAgent('ans-u5');

    const res = await agent.post(`/api/meetings/${meetingId}/apply`).send({ answer: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('신청 자격이 없으면(거절됨) 답변 검증보다 거절 사유가 먼저 나온다', async () => {
    const host = await createUser('ans-h6');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-01-01T12:00:00+09:00' });
    await pool.query('UPDATE meetings SET apply_question = $1 WHERE id = $2', ['왜 참여하나요', meetingId]);
    const { agent, userId } = await loginAgent('ans-u6');
    await insertParticipant(meetingId, userId, 'rejected');

    // 답변을 아예 보내지 않는다 — "답변이 필요합니다"가 아니라 "신청이 거절된 모임입니다"가 나와야 한다.
    const res = await agent.post(`/api/meetings/${meetingId}/apply`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('신청이 거절된 모임입니다');
  });
});
