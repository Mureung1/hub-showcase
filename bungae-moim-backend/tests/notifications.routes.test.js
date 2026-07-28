// GET /api/notifications, POST /api/notifications/read — 알림 조회·읽음(C).
// 핵심: 내 알림만, 최신순, meetingTitle 조인, bigint의 숫자 정규화,
// unreadCount는 LIMIT과 무관하게 전체를 센다.
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

async function createUser(providerId, nickname = '호스트') {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname)
     VALUES ('google', $1, $2, $3) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname]
  );
  return Number(rows[0].id);
}

async function insertMeeting(hostId, title = '알림 테스트 모임') {
  const { rows } = await pool.query(
    `INSERT INTO meetings (host_id, type, title, category, description, region_sido, region_sigungu,
       start_at, end_at, capacity, adult_only, open_chat_url, status)
     VALUES ($1,'small',$2,'운동','설명','서울특별시','강남구',
       '2030-01-01T10:00:00+09:00','2030-01-01T12:00:00+09:00',NULL,false,
       'https://open.kakao.com/o/test','recruiting') RETURNING id`,
    [hostId, title]
  );
  return Number(rows[0].id);
}

// createdAt을 받는 이유: 지정하지 않으면 DEFAULT now()로 연달아 들어간 행들의 시각이
// 사실상 같아져서, ORDER BY가 아예 없는 구현도 정렬 테스트를 통과한다.
async function insertNotification(userId, meetingId, type, createdAt = null, isRead = false) {
  if (createdAt === null) {
    await pool.query(
      'INSERT INTO notifications (user_id, meeting_id, type, is_read) VALUES ($1,$2,$3,$4)',
      [userId, meetingId, type, isRead]
    );
    return;
  }
  await pool.query(
    'INSERT INTO notifications (user_id, meeting_id, type, is_read, created_at) VALUES ($1,$2,$3,$4,$5)',
    [userId, meetingId, type, isRead, createdAt]
  );
}

describe('GET /api/notifications', () => {
  it('비로그인은 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('알림이 없으면 빈 목록과 미읽음 0', async () => {
    const { agent } = await loginAgent('n-u0');
    const res = await agent.get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ items: [], unreadCount: 0 });
  });

  it('내 알림만 최신순으로 주고 모임 제목을 함께 준다', async () => {
    const { agent, userId } = await loginAgent('n-u1');
    const host = await createUser('n-h1');
    const meetingId = await insertMeeting(host, '등산 번개');
    await insertNotification(userId, meetingId, 'application_approved', '2026-07-27T10:00:00');
    await insertNotification(userId, meetingId, 'meeting_cancelled', '2026-07-27T12:00:00');
    await insertNotification(host, meetingId, 'new_application', '2026-07-27T11:00:00');

    const res = await agent.get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items.map((n) => n.type)).toEqual([
      'meeting_cancelled',
      'application_approved',
    ]);
    expect(res.body.data.items[0]).toMatchObject({
      meetingId,
      meetingTitle: '등산 번개',
      isRead: false,
    });
    // bigint는 pg가 문자열로 준다 — 정규화를 빠뜨리면 여기서 걸린다.
    expect(typeof res.body.data.items[0].id).toBe('number');
    expect(typeof res.body.data.items[0].meetingId).toBe('number');
  });

  it('최근 20건만 주지만 미읽음 수는 전체를 센다', async () => {
    const { agent, userId } = await loginAgent('n-u2');
    const host = await createUser('n-h2');
    const meetingId = await insertMeeting(host);
    for (let i = 0; i < 25; i += 1) {
      await insertNotification(userId, meetingId, 'new_application', `2026-07-2${i % 8}T0${i % 9}:00:00`);
    }

    const res = await agent.get('/api/notifications');
    expect(res.body.data.items).toHaveLength(20);
    expect(res.body.data.unreadCount).toBe(25);
  });

  it('읽은 알림은 미읽음 수에서 빠지지만 목록에는 남는다', async () => {
    const { agent, userId } = await loginAgent('n-u3');
    const host = await createUser('n-h3');
    const meetingId = await insertMeeting(host);
    await insertNotification(userId, meetingId, 'application_approved', null, true);
    await insertNotification(userId, meetingId, 'application_rejected', null, false);

    const res = await agent.get('/api/notifications');
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.unreadCount).toBe(1);
  });
});

describe('POST /api/notifications/read', () => {
  it('비로그인은 401', async () => {
    const res = await request(app).post('/api/notifications/read');
    expect(res.status).toBe(401);
  });

  it('내 미읽음을 전부 읽음 처리하고 남의 알림은 건드리지 않는다', async () => {
    const { agent, userId } = await loginAgent('n-u4');
    const other = await createUser('n-o4');
    const meetingId = await insertMeeting(other);
    await insertNotification(userId, meetingId, 'application_approved');
    await insertNotification(userId, meetingId, 'application_rejected');
    await insertNotification(other, meetingId, 'new_application');

    const res = await agent.post('/api/notifications/read');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ unreadCount: 0 });

    const after = await agent.get('/api/notifications');
    expect(after.body.data.unreadCount).toBe(0);

    const otherUnread = await pool.query(
      'SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false',
      [other]
    );
    expect(otherUnread.rows[0].n).toBe(1);
  });
});
