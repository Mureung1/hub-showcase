// GET /api/meetings/:id — 상세 조회.
// 핵심 관심사는 두 가지다: (1) host/confirmedCount/myParticipation이 정확한가,
// (2) openChatUrl이 확정 전 사용자에게 새지 않는가 (API 명세서 2번).
jest.mock('../src/services/oauthClients');

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { exchangeGoogleCode } = require('../src/services/oauthClients');

afterAll(async () => {
  await pool.end();
});

const OPEN_CHAT_URL = 'https://open.kakao.com/o/detail-test';

// 로그인된 supertest agent와 그 사용자의 id를 함께 돌려준다.
async function loginAgent(providerId, nickname = '상세유저') {
  exchangeGoogleCode.mockResolvedValueOnce({
    providerId,
    email: `${providerId}@test.com`,
    nickname,
  });
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/google').send({ code: 'code' });
  return { agent, userId: Number(res.body.data.user.id) };
}

// 로그인 없이 사용자 row만 만든다(모임장/참여자 세팅용).
async function createUser(providerId, nickname = '상세호스트', trustScore = 52.5) {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname, trust_score)
     VALUES ('google', $1, $2, $3, $4)
     RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname, trustScore]
  );
  return Number(rows[0].id);
}

async function insertMeeting(hostId, overrides = {}) {
  const m = {
    type: 'flash',
    title: '상세 테스트 모임',
    category: '운동',
    description: '설명입니다',
    regionSido: '서울특별시',
    regionSigungu: '강남구',
    regionEupmyeondong: '역삼동',
    startAt: '2030-01-01T10:00:00+09:00',
    endAt: null,
    capacity: 4,
    adultOnly: false,
    openChatUrl: OPEN_CHAT_URL,
    status: 'recruiting',
    ...overrides,
  };
  const { rows } = await pool.query(
    `INSERT INTO meetings
       (host_id, type, title, category, description, region_sido, region_sigungu,
        region_eupmyeondong, start_at, end_at, capacity, adult_only, open_chat_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      hostId, m.type, m.title, m.category, m.description, m.regionSido, m.regionSigungu,
      m.regionEupmyeondong, m.startAt, m.endAt, m.capacity, m.adultOnly, m.openChatUrl, m.status,
    ]
  );
  return Number(rows[0].id);
}

async function insertParticipant(meetingId, userId, status) {
  await pool.query(
    `INSERT INTO meeting_participants (meeting_id, user_id, status)
     VALUES ($1, $2, $3)`,
    [meetingId, userId, status]
  );
}

describe('GET /api/meetings/:id', () => {
  it('존재하지 않는 모임은 404 NOT_FOUND를 반환한다', async () => {
    const res = await request(app).get('/api/meetings/999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('숫자가 아닌 id도 404 NOT_FOUND를 반환한다', async () => {
    const res = await request(app).get('/api/meetings/abc');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('숫자로 시작하지만 뒤에 문자가 붙은 id는 404 NOT_FOUND를 반환한다 (parseInt로 앞부분만 읽는 문제 방지)', async () => {
    // 실제로 존재하는 모임을 만들어서 그 id 뒤에 문자를 붙인다. parseInt였다면
    // 앞부분("id")만 읽어서 이 모임을 그대로 반환해버리므로, 빈 DB에서 우연히
    // 404가 나오는 가짜 통과가 아니라 진짜로 유출을 잡아내는 테스트가 된다.
    const host = await createUser('detail-host-idcheck-1');
    const meetingId = await insertMeeting(host);

    const res = await request(app).get(`/api/meetings/${meetingId}abc`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.data).toBeUndefined();
  });

  it('소수점 형태의 id는 404 NOT_FOUND를 반환한다', async () => {
    // 위와 동일한 이유로 실존 모임의 id에 소수점을 붙여서 검증한다.
    const host = await createUser('detail-host-idcheck-2');
    const meetingId = await insertMeeting(host);

    const res = await request(app).get(`/api/meetings/${meetingId}.9`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.data).toBeUndefined();
  });

  it('안전한 정수 범위를 넘는 큰 숫자 id는 500이 아니라 404 NOT_FOUND를 반환한다 (DB 에러 원문 노출 방지)', async () => {
    const res = await request(app).get('/api/meetings/99999999999999999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('로그인 없이도 상세를 조회할 수 있고 host 정보가 포함된다', async () => {
    const host = await createUser('detail-host-1', '모임장A', 52.5);
    const meetingId = await insertMeeting(host);

    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(meetingId);
    expect(res.body.data.title).toBe('상세 테스트 모임');
    expect(res.body.data.host).toEqual({
      id: host,
      nickname: '모임장A',
      trustScore: 52.5,
    });
  });

  it('비로그인 조회는 myParticipation이 null이고 openChatUrl이 없다', async () => {
    const host = await createUser('detail-host-2');
    const meetingId = await insertMeeting(host);

    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.body.data.myParticipation).toBeNull();
    expect(res.body.data).not.toHaveProperty('openChatUrl');
  });

  it('confirmedCount는 confirmed와 approved만 센다', async () => {
    const host = await createUser('detail-host-3');
    const meetingId = await insertMeeting(host);
    const u1 = await createUser('detail-p1', '참여1');
    const u2 = await createUser('detail-p2', '참여2');
    const u3 = await createUser('detail-p3', '참여3');
    const u4 = await createUser('detail-p4', '참여4');

    await insertParticipant(meetingId, u1, 'confirmed');
    await insertParticipant(meetingId, u2, 'approved');
    await insertParticipant(meetingId, u3, 'pending');
    await insertParticipant(meetingId, u4, 'cancelled');

    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.body.data.confirmedCount).toBe(2);
  });

  it('참여 이력이 없는 로그인 사용자에게는 openChatUrl을 주지 않는다', async () => {
    const host = await createUser('detail-host-4');
    const meetingId = await insertMeeting(host);
    const { agent } = await loginAgent('detail-viewer-1');

    const res = await agent.get(`/api/meetings/${meetingId}`);
    expect(res.body.data.myParticipation).toBeNull();
    expect(res.body.data).not.toHaveProperty('openChatUrl');
  });

  it('confirmed 참여자에게는 openChatUrl을 준다', async () => {
    const host = await createUser('detail-host-5');
    const meetingId = await insertMeeting(host);
    const { agent, userId } = await loginAgent('detail-viewer-2');
    await insertParticipant(meetingId, userId, 'confirmed');

    const res = await agent.get(`/api/meetings/${meetingId}`);
    expect(res.body.data.myParticipation).toEqual({ status: 'confirmed' });
    expect(res.body.data.openChatUrl).toBe(OPEN_CHAT_URL);
  });

  it('소모임 pending 신청자에게는 아직 openChatUrl을 주지 않는다', async () => {
    const host = await createUser('detail-host-6');
    const meetingId = await insertMeeting(host, {
      type: 'small',
      capacity: null,
      endAt: '2030-12-31T10:00:00+09:00',
    });
    const { agent, userId } = await loginAgent('detail-viewer-3');
    await insertParticipant(meetingId, userId, 'pending');

    const res = await agent.get(`/api/meetings/${meetingId}`);
    expect(res.body.data.myParticipation).toEqual({ status: 'pending' });
    expect(res.body.data).not.toHaveProperty('openChatUrl');
  });

  it('소모임 approved 참여자에게는 openChatUrl을 준다', async () => {
    const host = await createUser('detail-host-7');
    const meetingId = await insertMeeting(host, {
      type: 'small',
      capacity: null,
      endAt: '2030-12-31T10:00:00+09:00',
    });
    const { agent, userId } = await loginAgent('detail-viewer-4');
    await insertParticipant(meetingId, userId, 'approved');

    const res = await agent.get(`/api/meetings/${meetingId}`);
    expect(res.body.data.openChatUrl).toBe(OPEN_CHAT_URL);
  });

  it('모임장 본인은 신청하지 않아도 openChatUrl을 볼 수 있다', async () => {
    const { agent, userId } = await loginAgent('detail-host-self', '본인모임장');
    const meetingId = await insertMeeting(userId);

    const res = await agent.get(`/api/meetings/${meetingId}`);
    expect(res.body.data.openChatUrl).toBe(OPEN_CHAT_URL);
    expect(res.body.data.myParticipation).toBeNull();
  });

  it('취소된 모임도 상세는 조회된다 (목록에서만 빠진다)', async () => {
    const host = await createUser('detail-host-8');
    const meetingId = await insertMeeting(host, { status: 'cancelled' });

    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('지난 모임도 상세는 조회된다', async () => {
    const host = await createUser('detail-host-9');
    const meetingId = await insertMeeting(host, { startAt: '2000-01-01T10:00:00+09:00' });

    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(meetingId);
  });

  it('성인 전용 모임을 성인이 조회하면 canApply true, blockReason null', async () => {
    const host = await createUser('detail-canapply-host');
    const meetingId = await insertMeeting(host, { adultOnly: true });
    const { agent, userId } = await loginAgent('detail-canapply-adult');
    await pool.query('UPDATE users SET birth_date = $1 WHERE id = $2', ['1990-01-01', userId]);

    const res = await agent.get(`/api/meetings/${meetingId}`);
    expect(res.body.data.canApply).toBe(true);
    expect(res.body.data.blockReason).toBeNull();
  });

  it('성인 전용 모임을 생년월일 없는 계정이 조회하면 BIRTHDATE_REQUIRED', async () => {
    const host = await createUser('detail-canapply-host2');
    const meetingId = await insertMeeting(host, { adultOnly: true });
    const { agent } = await loginAgent('detail-canapply-nobirth'); // birthDate 없음

    const res = await agent.get(`/api/meetings/${meetingId}`);
    expect(res.body.data.canApply).toBe(false);
    expect(res.body.data.blockReason).toBe('BIRTHDATE_REQUIRED');
  });

  it('비로그인 조회는 blockReason이 LOGIN_REQUIRED', async () => {
    const host = await createUser('detail-canapply-host3');
    const meetingId = await insertMeeting(host);
    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.body.data.canApply).toBe(false);
    expect(res.body.data.blockReason).toBe('LOGIN_REQUIRED');
  });

  it('미래 모임은 isPast가 false', async () => {
    const host = await createUser('past-h1');
    const meetingId = await insertMeeting(host, { startAt: '2030-01-01T10:00:00+09:00', endAt: null });
    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isPast).toBe(false);
  });

  it('지난 모임은 isPast가 true', async () => {
    const host = await createUser('past-h2');
    const meetingId = await insertMeeting(host, { startAt: '2020-01-01T10:00:00+09:00', endAt: null });
    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.isPast).toBe(true);
  });

  it('상세 응답에 applyQuestion이 포함된다', async () => {
    const host = await createUser('detail-q-host');
    const meetingId = await insertMeeting(host, { type: 'small', endAt: '2030-01-01T12:00:00+09:00', capacity: null });
    await pool.query('UPDATE meetings SET apply_question = $1 WHERE id = $2', ['왜 참여하나요', meetingId]);

    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.applyQuestion).toBe('왜 참여하나요');
  });
});
