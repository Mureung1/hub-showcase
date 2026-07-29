// GET /api/evaluations/pending — 내가 평가해야 할 모임(설계 4.1~4.2).
// 핵심: 종료 후 14일 창, 취소된 모임 제외, 확정이었던 사람만, 이미 한 평가는 빠진다.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

async function loginAgent(providerId, nickname = '사용자') {
  exchangeGoogleCode.mockResolvedValueOnce({ providerId, email: `${providerId}@test.com`, nickname });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/google').send({ code: 'code' });
  return { agent, userId: Number(res.body.data.user.id) };
}

async function createUser(providerId, nickname = '유저') {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname)
     VALUES ('google', $1, $2, $3) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname]
  );
  return Number(rows[0].id);
}

// endedDaysAgo: 며칠 전에 끝난 모임인가. 창(14일) 경계 검증에 쓴다.
async function createMeeting(hostId, { endedDaysAgo = 1, status = 'recruiting' } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO meetings (host_id, type, title, category, description, region_sido, region_sigungu,
       start_at, end_at, capacity, adult_only, open_chat_url, status)
     VALUES ($1,'small','평가 대상','운동','설명','서울특별시','강남구',
       now() - ($2 || ' days')::interval - interval '2 hours',
       now() - ($2 || ' days')::interval,
       NULL,false,'https://open.kakao.com/o/test',$3) RETURNING id`,
    [hostId, String(endedDaysAgo), status]
  );
  return Number(rows[0].id);
}

async function addParticipant(meetingId, userId, status = 'approved') {
  await pool.query(
    'INSERT INTO meeting_participants (meeting_id, user_id, status) VALUES ($1,$2,$3)',
    [meetingId, userId, status]
  );
}

describe('GET /api/evaluations/pending', () => {
  it('비로그인은 401', async () => {
    const res = await request(app).get('/api/evaluations/pending');
    expect(res.status).toBe(401);
  });

  it('평가할 것이 없으면 빈 목록', async () => {
    const { agent } = await loginAgent('e-u0');
    const res = await agent.get('/api/evaluations/pending');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ items: [], count: 0 });
  });

  it('모임장에게는 확정 참여자 전원이 대상으로 뜬다', async () => {
    const { agent, userId: hostId } = await loginAgent('e-h1', '모임장');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('e-a1', '가');
    const b = await createUser('e-b1', '나');
    const rejected = await createUser('e-r1', '거절당한사람');
    await addParticipant(meetingId, a, 'approved');
    await addParticipant(meetingId, b, 'confirmed');
    await addParticipant(meetingId, rejected, 'rejected');

    const res = await agent.get('/api/evaluations/pending');
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.items[0].role).toBe('host');
    expect(res.body.data.items[0].meeting.id).toBe(meetingId);
    const targetIds = res.body.data.items[0].targets.map((t) => t.userId).sort((x, y) => x - y);
    expect(targetIds).toEqual([a, b].sort((x, y) => x - y));
  });

  it('확정 참여자에게는 모임장 한 명이 대상으로 뜬다', async () => {
    const host = await createUser('e-h2', '모임장');
    const meetingId = await createMeeting(host);
    const { agent, userId } = await loginAgent('e-p2', '참여자');
    await addParticipant(meetingId, userId, 'approved');

    const res = await agent.get('/api/evaluations/pending');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].role).toBe('participant');
    expect(res.body.data.items[0].targets).toEqual([{ userId: host, nickname: '모임장' }]);
  });

  it('아직 끝나지 않은 모임은 대상이 아니다', async () => {
    const { agent, userId: hostId } = await loginAgent('e-h3');
    const meetingId = await createMeeting(hostId, { endedDaysAgo: -3 });
    await addParticipant(meetingId, await createUser('e-a3'), 'approved');

    const res = await agent.get('/api/evaluations/pending');
    expect(res.body.data.items).toEqual([]);
  });

  it('종료 후 14일이 지나면 창이 닫힌다', async () => {
    const { agent, userId: hostId } = await loginAgent('e-h4');
    const open = await createMeeting(hostId, { endedDaysAgo: 13 });
    const closed = await createMeeting(hostId, { endedDaysAgo: 15 });
    await addParticipant(open, await createUser('e-a4'), 'approved');
    await addParticipant(closed, await createUser('e-b4'), 'approved');

    const res = await agent.get('/api/evaluations/pending');
    expect(res.body.data.items.map((i) => i.meeting.id)).toEqual([open]);
  });

  it('취소된 모임은 평가창이 열리지 않는다', async () => {
    const { agent, userId: hostId } = await loginAgent('e-h5');
    const meetingId = await createMeeting(hostId, { status: 'cancelled' });
    await addParticipant(meetingId, await createUser('e-a5'), 'approved');

    const res = await agent.get('/api/evaluations/pending');
    expect(res.body.data.items).toEqual([]);
  });

  it('이미 평가한 상대는 대상에서 빠지고, 전원 평가했으면 모임 자체가 사라진다', async () => {
    const { agent, userId: hostId } = await loginAgent('e-h6');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('e-a6', '가');
    const b = await createUser('e-b6', '나');
    await addParticipant(meetingId, a, 'approved');
    await addParticipant(meetingId, b, 'approved');

    await pool.query(
      `INSERT INTO meeting_evaluations (meeting_id, rater_id, ratee_id, attended)
       VALUES ($1,$2,$3,true)`,
      [meetingId, hostId, a]
    );

    const partial = await agent.get('/api/evaluations/pending');
    expect(partial.body.data.items[0].targets.map((t) => t.userId)).toEqual([b]);

    await pool.query(
      `INSERT INTO meeting_evaluations (meeting_id, rater_id, ratee_id, attended)
       VALUES ($1,$2,$3,true)`,
      [meetingId, hostId, b]
    );

    const done = await agent.get('/api/evaluations/pending');
    expect(done.body.data.items).toEqual([]);
  });

  it('신청만 하고 거절·취소된 사람에게는 평가창이 열리지 않는다', async () => {
    const host = await createUser('e-h7');
    const meetingId = await createMeeting(host);
    const { agent, userId } = await loginAgent('e-p7');
    await addParticipant(meetingId, userId, 'rejected');

    const res = await agent.get('/api/evaluations/pending');
    expect(res.body.data.items).toEqual([]);
  });
});
