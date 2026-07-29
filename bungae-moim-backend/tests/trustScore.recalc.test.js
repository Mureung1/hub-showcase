// 재계산: 평가·취소 이력 → users.trust_score 캐시. DB 통합 테스트다.
const pool = require('../src/config/db');
const withTransaction = require('../src/utils/withTransaction');
const { recalculateTrustScore } = require('../src/services/evaluationService');

afterAll(async () => {
  await pool.end();
});

async function createUser(providerId, nickname = '유저') {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname)
     VALUES ('google', $1, $2, $3) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname]
  );
  return Number(rows[0].id);
}

async function createMeeting(hostId) {
  const { rows } = await pool.query(
    `INSERT INTO meetings (host_id, type, title, category, description, region_sido, region_sigungu,
       start_at, end_at, capacity, adult_only, open_chat_url, status)
     VALUES ($1,'small','평가 테스트','운동','설명','서울특별시','강남구',
       '2026-07-01T10:00:00','2026-07-01T12:00:00',NULL,false,
       'https://open.kakao.com/o/test','recruiting') RETURNING id`,
    [hostId]
  );
  return Number(rows[0].id);
}

async function insertEvaluation(meetingId, raterId, rateeId, attended, tags = []) {
  await pool.query(
    `INSERT INTO meeting_evaluations (meeting_id, rater_id, ratee_id, attended, tags)
     VALUES ($1,$2,$3,$4,$5)`,
    [meetingId, raterId, rateeId, attended, tags]
  );
}

async function readUser(userId) {
  const { rows } = await pool.query(
    'SELECT trust_score, evaluation_count, trust_score_updated_at FROM users WHERE id = $1',
    [userId]
  );
  return {
    trustScore: Number(rows[0].trust_score),
    evaluationCount: rows[0].evaluation_count,
    updatedAt: rows[0].trust_score_updated_at,
  };
}

describe('recalculateTrustScore', () => {
  it('이력이 없으면 50으로 유지하고 평가 수는 0', async () => {
    const userId = await createUser('r-u0');
    await withTransaction((client) => recalculateTrustScore(client, userId));

    const user = await readUser(userId);
    expect(user.trustScore).toBe(50);
    expect(user.evaluationCount).toBe(0);
    expect(user.updatedAt).not.toBeNull();
  });

  it('한쪽만 제출한 출석 평가는 점수를 올린다', async () => {
    const host = await createUser('r-h1', '모임장');
    const part = await createUser('r-p1', '참여자');
    const meetingId = await createMeeting(host);
    await insertEvaluation(meetingId, host, part, true, ['punctual', 'friendly']);

    await withTransaction((client) => recalculateTrustScore(client, part));

    const user = await readUser(part);
    expect(user.trustScore).toBeGreaterThan(50);
    expect(user.evaluationCount).toBe(1);
  });

  it('진술이 엇갈리면 점수가 그대로고 평가 수에도 안 들어간다', async () => {
    const host = await createUser('r-h2', '모임장');
    const part = await createUser('r-p2', '참여자');
    const meetingId = await createMeeting(host);
    // 모임장은 "왔음", 참여자는 모임장을 "안 왔음" → 불일치 → 양쪽 무효
    await insertEvaluation(meetingId, host, part, true, ['punctual']);
    await insertEvaluation(meetingId, part, host, false);

    await withTransaction((client) => recalculateTrustScore(client, part));

    const user = await readUser(part);
    expect(user.trustScore).toBe(50);
    expect(user.evaluationCount).toBe(0);
  });

  it('반박 없는 노쇼는 점수를 크게 떨어뜨린다', async () => {
    const host = await createUser('r-h3', '모임장');
    const part = await createUser('r-p3', '참여자');
    const meetingId = await createMeeting(host);
    await insertEvaluation(meetingId, host, part, false);

    await withTransaction((client) => recalculateTrustScore(client, part));

    const user = await readUser(part);
    expect(Math.round(user.trustScore)).toBe(40);
    expect(user.evaluationCount).toBe(1);
  });

  it('확정 상태 임박 취소 이력은 감점으로 반영된다', async () => {
    const host = await createUser('r-h4', '모임장');
    const part = await createUser('r-p4', '참여자');
    const meetingId = await createMeeting(host);
    await pool.query(
      `INSERT INTO participation_cancellations (meeting_id, user_id, was_confirmed, hours_before_start)
       VALUES ($1,$2,true,2)`,
      [meetingId, part]
    );

    await withTransaction((client) => recalculateTrustScore(client, part));

    const user = await readUser(part);
    expect(user.trustScore).toBeLessThan(50);
    // 취소는 평가가 아니므로 평가 수에는 들어가지 않는다.
    expect(user.evaluationCount).toBe(0);
  });

  it('조기 취소는 점수를 깎지 않는다 — 일찍 취소하는 게 이득이어야 한다', async () => {
    const host = await createUser('r-h5', '모임장');
    const part = await createUser('r-p5', '참여자');
    const meetingId = await createMeeting(host);
    await pool.query(
      `INSERT INTO participation_cancellations (meeting_id, user_id, was_confirmed, hours_before_start)
       VALUES ($1,$2,true,72)`,
      [meetingId, part]
    );

    await withTransaction((client) => recalculateTrustScore(client, part));
    expect((await readUser(part)).trustScore).toBe(50);
  });
});
