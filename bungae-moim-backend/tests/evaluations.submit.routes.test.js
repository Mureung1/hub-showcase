// POST /api/meetings/:id/evaluations — 상호 평가 제출(설계 4.2, 4.5, 6.2).
// 핵심: 자격(모임장/확정 참여자), 대상 자격, 창(종료·14일·취소), 태그 상한, 24시간 1회 수정,
// rater+ratee 동시 재계산(진술 대조).
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

async function trustOf(userId) {
  const { rows } = await pool.query('SELECT trust_score, evaluation_count FROM users WHERE id = $1', [userId]);
  return { score: Number(rows[0].trust_score), count: rows[0].evaluation_count };
}

describe('POST /api/meetings/:id/evaluations', () => {
  it('비로그인은 401', async () => {
    const host = await createUser('s-h0');
    const meetingId = await createMeeting(host);
    const res = await request(app).post(`/api/meetings/${meetingId}/evaluations`).send({ evaluations: [] });
    expect(res.status).toBe(401);
  });

  it('모임장이 확정 참여자를 평가하면 그 사람 신뢰도가 오른다', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h1', '모임장');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a1', '가');
    await addParticipant(meetingId, a, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: true, tags: ['punctual', 'friendly'] }] });

    expect(res.status).toBe(201);
    expect(res.body.data.submitted).toBe(1);

    const after = await trustOf(a);
    expect(after.score).toBeGreaterThan(50);
    expect(after.count).toBe(1);
  });

  it('노쇼로 찍으면 신뢰도가 크게 떨어진다', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h2');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a2');
    await addParticipant(meetingId, a, 'approved');

    await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: false, tags: [] }] });

    expect(Math.round((await trustOf(a)).score)).toBe(40);
  });

  it('상대가 나중에 반대 진술을 내면 양쪽 판정이 되돌아간다(설계 6.2)', async () => {
    const { agent: hostAgent, userId: hostId } = await loginAgent('s-h3', '모임장');
    const meetingId = await createMeeting(hostId);
    const { agent: partAgent, userId: partId } = await loginAgent('s-p3', '참여자');
    await addParticipant(meetingId, partId, 'approved');

    // 1) 모임장이 참여자를 노쇼로 찍는다 → 참여자 40
    await hostAgent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: partId, attended: false, tags: [] }] });
    expect(Math.round((await trustOf(partId)).score)).toBe(40);

    // 2) 참여자가 "모임장은 왔다"고 평가 → 진술 불일치 → 양쪽 0점으로 복귀
    const res = await partAgent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: hostId, attended: true, tags: [] }] });
    expect(res.status).toBe(201);

    expect((await trustOf(partId)).score).toBe(50);
    expect((await trustOf(hostId)).score).toBe(50);
  });

  it('평가 자격이 없으면 403', async () => {
    const host = await createUser('s-h4');
    const meetingId = await createMeeting(host);
    const { agent } = await loginAgent('s-x4', '남');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: host, attended: true, tags: [] }] });
    expect(res.status).toBe(403);
  });

  it('거절당한 신청자는 평가할 수 없다(보복 평가 차단, D13)', async () => {
    const host = await createUser('s-h5');
    const meetingId = await createMeeting(host);
    const { agent, userId } = await loginAgent('s-p5');
    await addParticipant(meetingId, userId, 'rejected');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: host, attended: false, tags: ['rude'] }] });
    expect(res.status).toBe(403);
  });

  it('아직 끝나지 않은 모임은 평가할 수 없다', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h6');
    const meetingId = await createMeeting(hostId, { endedDaysAgo: -2 });
    const a = await createUser('s-a6');
    await addParticipant(meetingId, a, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: true, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('14일이 지나면 평가할 수 없다', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h7');
    const meetingId = await createMeeting(hostId, { endedDaysAgo: 15 });
    const a = await createUser('s-a7');
    await addParticipant(meetingId, a, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: true, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('취소된 모임은 평가할 수 없다', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h8');
    const meetingId = await createMeeting(hostId, { status: 'cancelled' });
    const a = await createUser('s-a8');
    await addParticipant(meetingId, a, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: true, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('모르는 태그나 4개 이상의 같은 부호 태그는 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h9');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a9');
    await addParticipant(meetingId, a, 'approved');

    const unknown = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: true, tags: ['nice_guy'] }] });
    expect(unknown.status).toBe(400);

    const tooMany = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({
        evaluations: [{ rateeId: a, attended: true, tags: ['punctual', 'friendly', 'good_talk', 'again'] }],
      });
    expect(tooMany.status).toBe(400);
  });

  it('24시간 내 1회 수정은 되고, 두 번째 수정은 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h10');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a10');
    await addParticipant(meetingId, a, 'approved');

    await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: false, tags: [] }] });

    const fix = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: true, tags: [] }] });
    expect(fix.status).toBe(201);
    expect((await trustOf(a)).score).toBeGreaterThan(50);

    const again = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: false, tags: [] }] });
    expect(again.status).toBe(400);
  });

  it('모임장이 확정 참여자가 아닌 사람을 평가하면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h11');
    const meetingId = await createMeeting(hostId);
    const outsider = await createUser('s-o11');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: outsider, attended: true, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('참여자가 다른 참여자를 지목하면 400(모임장만 평가 대상)', async () => {
    const host = await createUser('s-h12');
    const meetingId = await createMeeting(host);
    const { agent, userId: p1 } = await loginAgent('s-p12a', '참여자1');
    const p2 = await createUser('s-p12b', '참여자2');
    await addParticipant(meetingId, p1, 'approved');
    await addParticipant(meetingId, p2, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: p2, attended: true, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('모임장이 거절된 신청자를 평가하면 400(확정 참여자만 대상)', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h13');
    const meetingId = await createMeeting(hostId);
    const rejected = await createUser('s-r13');
    await addParticipant(meetingId, rejected, 'rejected');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: rejected, attended: true, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('제출 후 24시간이 지나면 수정할 수 없다', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h14');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a14');
    await addParticipant(meetingId, a, 'approved');

    await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: true, tags: [] }] });

    await pool.query(
      `UPDATE meeting_evaluations
          SET created_at = now() - interval '25 hours', updated_at = now() - interval '25 hours'
        WHERE meeting_id = $1 AND rater_id = $2 AND ratee_id = $3`,
      [meetingId, hostId, a]
    );

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: false, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('evaluations가 배열이 아니면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h15');
    const meetingId = await createMeeting(hostId);

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: 'nope' });
    expect(res.status).toBe(400);
  });

  it('evaluations가 빈 배열이면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h16');
    const meetingId = await createMeeting(hostId);

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [] });
    expect(res.status).toBe(400);
  });

  it('rateeId가 숫자가 아니면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h17');
    const meetingId = await createMeeting(hostId);

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: 'abc', attended: true, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('attended가 없으면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h18');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a18');
    await addParticipant(meetingId, a, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, tags: [] }] });
    expect(res.status).toBe(400);
  });

  it('attended가 boolean이 아니면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h19');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a19');
    await addParticipant(meetingId, a, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations: [{ rateeId: a, attended: 'yes', tags: [] }] });
    expect(res.status).toBe(400);
  });

  // 같은 rateeId를 두 번 담으면 각 항목마다 SELECT+INSERT/UPDATE가 반복 실행되고
  // submitted 카운트도 실제 반영 행 수와 어긋난다(마지막 값이 이기는 UPSERT라 중복분은
  // 그냥 덮어써질 뿐). 입력 단계에서 막는다.
  it('같은 rateeId를 두 번 담으면 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h20');
    const meetingId = await createMeeting(hostId);
    const a = await createUser('s-a20');
    await addParticipant(meetingId, a, 'approved');

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({
        evaluations: [
          { rateeId: a, attended: true, tags: [] },
          { rateeId: a, attended: false, tags: [] },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    // 거절됐으니 아무 것도 반영되지 않아야 한다.
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM meeting_evaluations WHERE meeting_id = $1',
      [meetingId]
    );
    expect(rows[0].n).toBe(0);
  });

  // 대상은 한 모임의 확정 참여자(모임장이 평가할 때) 또는 모임장 1명(참여자가 평가할 때)뿐이라
  // 50명이면 넉넉하다. 이 이상은 express.json() 100kb 한도 안에서도 반복 rateeId로 채울 수
  // 있고, submitEvaluations는 meetings 행을 FOR UPDATE로 잠근 채 항목마다 쿼리를 실행한다.
  it('51개 이상의 평가 대상은 400', async () => {
    const { agent, userId: hostId } = await loginAgent('s-h21');
    const meetingId = await createMeeting(hostId);

    const evaluations = Array.from({ length: 51 }, (_, i) => ({
      rateeId: 1000000 + i, // 실제 존재하지 않아도 개수 검증이 먼저 걸려야 한다.
      attended: true,
      tags: [],
    }));

    const res = await agent
      .post(`/api/meetings/${meetingId}/evaluations`)
      .send({ evaluations });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    // 개수 상한에서 걸린 것인지(50명까지) 확인한다 — 대상 자격 검사(다른 400 사유)와
    // 구분하기 위해 메시지까지 본다. rateeId가 전부 존재하지 않는 사용자라 상한이 없으면
    // "평가할 수 없는 대상입니다"로도 400이 나서, 상태 코드만으로는 이 검증이 실제로
    // 상한에서 걸렸는지 알 수 없다.
    expect(res.body.error.message).toContain('50명');
  });
});
