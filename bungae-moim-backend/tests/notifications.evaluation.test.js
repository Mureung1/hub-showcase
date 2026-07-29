// 평가 요청 알림은 크론 없이 GET /api/notifications에서 lazy 생성된다(2026-07-28 결정 Δ3).
// 핵심: 평가할 게 있을 때만, 모임당 한 번만, 남에게는 안 생긴다.
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');
const evaluationService = require('../src/services/evaluationService');

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

// endedDaysAgo: 며칠 전에 끝난 모임인가(Task 5 테스트에서 복사).
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

describe('평가 요청 알림 lazy 생성', () => {
  it('종료된 모임에 평가할 상대가 있으면 알림이 생긴다', async () => {
    const { agent, userId: hostId } = await loginAgent('n-ev1', '모임장');
    const meetingId = await createMeeting(hostId, { endedDaysAgo: 1 });
    await addParticipant(meetingId, await createUser('n-a1'), 'approved');

    const res = await agent.get('/api/notifications');
    expect(res.status).toBe(200);
    const types = res.body.data.items.map((n) => n.type);
    expect(types).toContain('evaluation_requested');
    expect(res.body.data.unreadCount).toBe(1);
  });

  it('두 번 조회해도 알림은 한 건이다(멱등)', async () => {
    const { agent, userId: hostId } = await loginAgent('n-ev2');
    const meetingId = await createMeeting(hostId, { endedDaysAgo: 1 });
    await addParticipant(meetingId, await createUser('n-a2'), 'approved');

    const first = await agent.get('/api/notifications');
    const second = await agent.get('/api/notifications');
    // 상태 코드도 함께 확인한다 — ON CONFLICT 없이 두 번째 INSERT가 유니크 위반으로
    // 500이 나도, 그 INSERT 자체는 통째로 실패해 행이 추가되지 않으므로 아래 COUNT만
    // 보면 우연히 1이 나와 이 케이스를 놓친다.
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM notifications WHERE type = 'evaluation_requested'"
    );
    expect(rows[0].n).toBe(1);
  });

  it('평가할 게 없으면 알림도 없다', async () => {
    const { agent, userId: hostId } = await loginAgent('n-ev3');
    await createMeeting(hostId, { endedDaysAgo: 1 }); // 확정 참여자가 없다

    await agent.get('/api/notifications');
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM notifications');
    expect(rows[0].n).toBe(0);
  });

  it('평가를 마치면 새로 생기지 않는다', async () => {
    const { agent, userId: hostId } = await loginAgent('n-ev4');
    const meetingId = await createMeeting(hostId, { endedDaysAgo: 1 });
    const a = await createUser('n-a4');
    await addParticipant(meetingId, a, 'approved');
    await pool.query(
      `INSERT INTO meeting_evaluations (meeting_id, rater_id, ratee_id, attended) VALUES ($1,$2,$3,true)`,
      [meetingId, hostId, a]
    );

    await agent.get('/api/notifications');
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM notifications');
    expect(rows[0].n).toBe(0);
  });

  it('lazy 생성이 실패해도 알림 조회는 200을 반환하고 기존 알림은 그대로 온다', async () => {
    const { agent, userId } = await loginAgent('n-ev5');
    const host = await createUser('n-h5');
    const meetingId = await createMeeting(host, { endedDaysAgo: 1 });
    // 이 사용자가 이미 갖고 있던, lazy 생성과 무관한 알림. 실패 격리가 안 되면
    // GET 자체가 500이 되어 이 알림도 함께 안 보이게 된다.
    await pool.query(
      `INSERT INTO notifications (user_id, type, meeting_id) VALUES ($1, 'new_application', $2)`,
      [userId, meetingId]
    );

    const listSpy = jest
      .spyOn(evaluationService, 'listPendingEvaluations')
      .mockRejectedValueOnce(new Error('DB 순간 장애(테스트로 주입)'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await agent.get('/api/notifications');

    expect(res.status).toBe(200);
    const types = res.body.data.items.map((n) => n.type);
    expect(types).toContain('new_application');
    expect(types).not.toContain('evaluation_requested');
    // 실패는 삼켜지되 흔적 없이 사라지진 않는다 — 서버 로그(콘솔)에는 남아야 한다.
    expect(consoleSpy).toHaveBeenCalled();

    listSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
