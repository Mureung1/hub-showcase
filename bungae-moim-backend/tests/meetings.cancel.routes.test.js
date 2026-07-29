// DELETE /api/meetings/:id/apply — 참여/신청 취소(F2).
// 핵심: 취소는 즉시 감점하지 않고 이력만 남긴다(신뢰도는 이력에서 재계산된다).
// confirmed 취소는 flash 재오픈 + 이력(was_confirmed=true), pending 취소는 이력만
// (was_confirmed=false, 무감점), 이중취소는 이력이 늘지 않는다.
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

  it('확정 취소는 즉시 감점하지 않고 취소 이력만 남긴다', async () => {
    // 새 신뢰도 시스템에서는 점수가 이력에서 계산된다. 취소 시점에 trust_score를
    // 직접 깎으면 재계산이 그 값을 덮어써서 이중 감점 또는 유실이 생긴다.
    const host = await createUser('cancel-h1');
    const meetingId = await insertMeeting(host, { capacity: 1, status: 'closed' });
    const { agent, userId } = await loginAgent('cancel-u1');
    await insertParticipant(meetingId, userId, 'confirmed');

    const res = await agent.delete(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(200);
    expect(await meetingStatus(meetingId)).toBe('recruiting');
    expect(await participantStatus(meetingId, userId)).toBe('cancelled');

    const { rows } = await pool.query(
      'SELECT was_confirmed, hours_before_start FROM participation_cancellations WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].was_confirmed).toBe(true);
    // 이 모임의 시작(2030-01-01)은 먼 미래라 24시간 임박 취소가 아니다 → 감점 없음.
    expect(Number(rows[0].hours_before_start)).toBeGreaterThan(24);
    expect(await trustScore(userId)).toBe(50);
  });

  it('pending 취소도 이력을 남기되 was_confirmed가 false이고 감점이 없다', async () => {
    const host = await createUser('cancel-h2');
    const meetingId = await insertMeeting(host, { type: 'small', capacity: null, endAt: '2030-12-31T10:00:00+09:00' });
    const { agent, userId } = await loginAgent('cancel-u2');
    await insertParticipant(meetingId, userId, 'pending');

    const before = await trustScore(userId);
    await agent.delete(`/api/meetings/${meetingId}/apply`);
    expect(await trustScore(userId)).toBe(before);

    const { rows } = await pool.query(
      'SELECT was_confirmed FROM participation_cancellations WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].was_confirmed).toBe(false);
  });

  // 이 테스트만은 회귀 위험이 가장 큰 지점을 실제 쓰기 경로(SQL)로 통과시킨다:
  // hours_before_start의 단위(시간)와 24시간 임박 경계, 그리고 recalculateTrustScore 호출이
  // 실제로 연결돼 있는지. 다른 취소 테스트는 전부 먼 미래 모임이라 이 경계를 넘지 않는다.
  it('임박 취소(시작 2시간 전)는 hours_before_start가 24 미만으로 기록되고 점수가 깎인다', async () => {
    const host = await createUser('cancel-h12');
    const { rows } = await pool.query(
      `INSERT INTO meetings (host_id, type, title, category, description, region_sido, region_sigungu,
         region_eupmyeondong, start_at, end_at, capacity, adult_only, open_chat_url, status)
       VALUES ($1,'flash','임박취소테스트','운동','설명','서울특별시','강남구','역삼동',
               now() + interval '2 hours', NULL, 2, false, 'https://open.kakao.com/o/t', 'closed')
       RETURNING id`,
      [host]
    );
    const meetingId = Number(rows[0].id);
    const { agent, userId } = await loginAgent('cancel-u12');
    await insertParticipant(meetingId, userId, 'confirmed');

    const res = await agent.delete(`/api/meetings/${meetingId}/apply`);
    expect(res.status).toBe(200);

    const hist = await pool.query(
      'SELECT hours_before_start FROM participation_cancellations WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    const hoursBeforeStart = Number(hist.rows[0].hours_before_start);
    expect(hoursBeforeStart).toBeGreaterThan(1);
    expect(hoursBeforeStart).toBeLessThan(24);
    expect(await trustScore(userId)).toBeLessThan(50);
  });

  it('이미 취소된 걸 다시 취소해도 이력이 추가되지 않는다(404, 이력 1건 그대로)', async () => {
    const host = await createUser('cancel-h3');
    const meetingId = await insertMeeting(host);
    const { agent, userId } = await loginAgent('cancel-u3');
    await insertParticipant(meetingId, userId, 'confirmed');

    await agent.delete(`/api/meetings/${meetingId}/apply`); // 첫 취소(이력 1건)
    const res = await agent.delete(`/api/meetings/${meetingId}/apply`); // 이중 취소
    expect(res.status).toBe(404);

    const { rows } = await pool.query(
      'SELECT id FROM participation_cancellations WHERE meeting_id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    expect(rows).toHaveLength(1); // 더 안 늘어남
  });

  // 이미 끝난 모임은 취소할 수 없다. 지난 모임을 "취소"한다는 게 말이 안 되기도 하지만,
  // 신뢰도 개편 설계(2026-07-22-신뢰도-알고리즘-design.md 6.3)의 선행 조건이기도 하다 —
  // 종료 후 취소가 되면 status가 cancelled로 바뀌어 평가 대상에서 빠지므로,
  // 노쇼한 사람이 취소를 눌러 노쇼 감점을 회피하는 경로가 열린다.
  it('종료된 모임은 취소할 수 없다(400)', async () => {
    const host = await createUser('cancel-h9');
    const meetingId = await insertMeeting(host, { startAt: '2020-01-01T10:00:00+09:00' });
    const { agent, userId } = await loginAgent('cancel-u9');
    await insertParticipant(meetingId, userId, 'confirmed');

    const res = await agent.delete(`/api/meetings/${meetingId}/apply`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('종료된 모임 취소 시도는 신뢰도를 깎지 않고 상태도 그대로 둔다', async () => {
    const host = await createUser('cancel-h10');
    const meetingId = await insertMeeting(host, { startAt: '2020-01-01T10:00:00+09:00' });
    const { agent, userId } = await loginAgent('cancel-u10');
    await insertParticipant(meetingId, userId, 'confirmed');
    const before = await trustScore(userId);

    await agent.delete(`/api/meetings/${meetingId}/apply`);

    expect(await trustScore(userId)).toBe(before);
    expect(await participantStatus(meetingId, userId)).toBe('confirmed');
  });

  // 소모임은 end_at이 기준이다. 시작은 지났지만 아직 진행 중인 모임은 취소할 수 있어야 한다.
  it('시작은 지났지만 아직 끝나지 않은 소모임은 취소할 수 있다', async () => {
    const host = await createUser('cancel-h11');
    const meetingId = await insertMeeting(host, {
      type: 'small', capacity: null,
      startAt: '2020-01-01T10:00:00+09:00', endAt: '2030-12-31T10:00:00+09:00',
    });
    const { agent, userId } = await loginAgent('cancel-u11');
    await insertParticipant(meetingId, userId, 'approved');

    const res = await agent.delete(`/api/meetings/${meetingId}/apply`);

    expect(res.status).toBe(200);
    expect(await participantStatus(meetingId, userId)).toBe('cancelled');
  });
});
