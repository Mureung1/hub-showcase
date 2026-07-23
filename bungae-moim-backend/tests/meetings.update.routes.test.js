// PATCH /api/meetings/:id — 모임 수정(E4).
// 핵심: 모임장만, type 불변, 상태/정원/adultOnly 가드, flash status 재계산.
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

async function createUser(providerId, { nickname = '유저', trustScore = 50.0, birthDate = null } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname, trust_score, birth_date)
     VALUES ('google', $1, $2, $3, $4, $5) RETURNING id`,
    [providerId, `${providerId}@test.com`, nickname, trustScore, birthDate]
  );
  return Number(rows[0].id);
}

async function insertMeeting(hostId, overrides = {}) {
  const m = {
    type: 'small', title: '원본 제목', category: '운동', description: '설명',
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

// small 모임 수정용 유효 본문. 개별 테스트에서 override로 필드를 바꾼다.
function smallBody(overrides = {}) {
  return {
    type: 'small', title: '수정된 제목', category: '스터디', description: '수정 설명',
    regionSido: '서울특별시', regionSigungu: '서초구', regionEupmyeondong: '서초동',
    startAt: '2030-02-02T10:00:00+09:00', endAt: '2030-02-02T14:00:00+09:00',
    capacity: null, adultOnly: false, openChatUrl: 'https://open.kakao.com/o/edited',
    ...overrides,
  };
}

describe('PATCH /api/meetings/:id', () => {
  it('비로그인은 401', async () => {
    const host = await createUser('u-h0');
    const meetingId = await insertMeeting(host);
    const res = await request(app).patch(`/api/meetings/${meetingId}`).send(smallBody());
    expect(res.status).toBe(401);
  });

  it('모임장이 아니면 403', async () => {
    const host = await createUser('u-h1');
    const meetingId = await insertMeeting(host);
    const { agent } = await loginAgent('u-o1');
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('없는 모임은 404', async () => {
    const { agent } = await loginAgent('u-o2');
    const res = await agent.patch('/api/meetings/999999').send(smallBody());
    expect(res.status).toBe(404);
  });

  it(':id가 숫자가 아니면 404', async () => {
    const { agent } = await loginAgent('u-o3');
    const res = await agent.patch('/api/meetings/1abc').send(smallBody());
    expect(res.status).toBe(404);
  });

  it('type 변경 시도는 400', async () => {
    const { agent, userId } = await loginAgent('u-h4');
    const meetingId = await insertMeeting(userId, { type: 'small' });
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ type: 'flash', capacity: 4 }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('모임장이 수정하면 200, 필드가 응답·DB에 반영', async () => {
    const { agent, userId } = await loginAgent('u-h5');
    const meetingId = await insertMeeting(userId, { type: 'small' });
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ title: '새 제목' }));
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('새 제목');
    expect(res.body.data.regionSigungu).toBe('서초구');
    expect(res.body.data.category).toBe('스터디');
    expect(res.body.data.description).toBe('수정 설명');
    expect(res.body.data.regionEupmyeondong).toBe('서초동');
    expect(res.body.data.openChatUrl).toBe('https://open.kakao.com/o/edited');
    expect(res.body.data.adultOnly).toBe(false);

    const db = await pool.query('SELECT title, region_sigungu FROM meetings WHERE id = $1', [meetingId]);
    expect(db.rows[0].title).toBe('새 제목');
    expect(db.rows[0].region_sigungu).toBe('서초구');
  });

  it('regionEupmyeondong을 null로 보내면 전체교체로 값이 지워진다', async () => {
    const { agent, userId } = await loginAgent('u-h17');
    const meetingId = await insertMeeting(userId, { type: 'small', regionEupmyeondong: '역삼동' });
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ regionEupmyeondong: null }));
    expect(res.status).toBe(200);
    expect(res.body.data.regionEupmyeondong).toBeNull();

    const db = await pool.query('SELECT region_eupmyeondong FROM meetings WHERE id = $1', [meetingId]);
    expect(db.rows[0].region_eupmyeondong).toBeNull();
  });

  it('제목 길이 초과는 400 (validateCreateMeeting 재사용 확인)', async () => {
    const { agent, userId } = await loginAgent('u-h6');
    const meetingId = await insertMeeting(userId, { type: 'small' });
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ title: 'ㄱ'.repeat(101) }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('취소된 모임은 400', async () => {
    const { agent, userId } = await loginAgent('u-h7');
    const meetingId = await insertMeeting(userId, { type: 'small', status: 'cancelled' });
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody());
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('종료된(지난) 모임은 400', async () => {
    const { agent, userId } = await loginAgent('u-h8');
    // 과거 종료 일시 → COALESCE(end_at,start_at) < now()
    const meetingId = await insertMeeting(userId, {
      type: 'small', startAt: '2020-01-01T10:00:00+09:00', endAt: '2020-01-01T12:00:00+09:00',
    });
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody());
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('flash 정원을 확정 인원보다 적게 줄이면 400', async () => {
    const { agent, userId } = await loginAgent('u-h9');
    const meetingId = await insertMeeting(userId, {
      type: 'flash', capacity: 4, endAt: null, startAt: '2030-03-03T19:00:00+09:00', status: 'recruiting',
    });
    const a1 = await createUser('u-p9a');
    const a2 = await createUser('u-p9b');
    await insertParticipant(meetingId, a1, 'confirmed');
    await insertParticipant(meetingId, a2, 'confirmed');

    const body = {
      type: 'flash', title: '수정', category: '운동', description: 'x',
      regionSido: '서울특별시', regionSigungu: '강남구', regionEupmyeondong: null,
      startAt: '2030-03-03T20:00:00+09:00', endAt: null, capacity: 1, adultOnly: false,
      openChatUrl: 'https://open.kakao.com/o/edited',
    };
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('flash 정원을 확정 인원 이상으로 두면 200', async () => {
    const { agent, userId } = await loginAgent('u-h10');
    const meetingId = await insertMeeting(userId, {
      type: 'flash', capacity: 4, endAt: null, startAt: '2030-03-03T19:00:00+09:00', status: 'recruiting',
    });
    await insertParticipant(meetingId, await createUser('u-p10'), 'confirmed');

    const body = {
      type: 'flash', title: '수정', category: '운동', description: 'x',
      regionSido: '서울특별시', regionSigungu: '강남구', regionEupmyeondong: null,
      startAt: '2030-03-03T20:00:00+09:00', endAt: null, capacity: 2, adultOnly: false,
      openChatUrl: 'https://open.kakao.com/o/edited',
    };
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data.capacity).toBe(2);
  });

  it('꽉 찬(closed) flash 정원을 늘리면 status가 recruiting으로 재계산', async () => {
    const { agent, userId } = await loginAgent('u-h11');
    const meetingId = await insertMeeting(userId, {
      type: 'flash', capacity: 2, endAt: null, startAt: '2030-03-03T19:00:00+09:00', status: 'closed',
    });
    await insertParticipant(meetingId, await createUser('u-p11a'), 'confirmed');
    await insertParticipant(meetingId, await createUser('u-p11b'), 'confirmed');

    const body = {
      type: 'flash', title: '수정', category: '운동', description: 'x',
      regionSido: '서울특별시', regionSigungu: '강남구', regionEupmyeondong: null,
      startAt: '2030-03-03T20:00:00+09:00', endAt: null, capacity: 5, adultOnly: false,
      openChatUrl: 'https://open.kakao.com/o/edited',
    };
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('recruiting');
  });

  it('recruiting flash 정원을 확정 인원과 같게 줄이면 status가 closed로 재계산', async () => {
    const { agent, userId } = await loginAgent('u-h12');
    const meetingId = await insertMeeting(userId, {
      type: 'flash', capacity: 4, endAt: null, startAt: '2030-03-03T19:00:00+09:00', status: 'recruiting',
    });
    await insertParticipant(meetingId, await createUser('u-p12a'), 'confirmed');
    await insertParticipant(meetingId, await createUser('u-p12b'), 'confirmed');

    const body = {
      type: 'flash', title: '수정', category: '운동', description: 'x',
      regionSido: '서울특별시', regionSigungu: '강남구', regionEupmyeondong: null,
      startAt: '2030-03-03T20:00:00+09:00', endAt: null, capacity: 2, adultOnly: false,
      openChatUrl: 'https://open.kakao.com/o/edited',
    };
    const res = await agent.patch(`/api/meetings/${meetingId}`).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('closed');
  });

  it('adultOnly 켤 때 미성년 참여자가 있으면 400', async () => {
    const { agent, userId } = await loginAgent('u-h13');
    const meetingId = await insertMeeting(userId, { type: 'small', adultOnly: false });
    const minor = await createUser('u-p13', { birthDate: '2015-01-01' }); // 미성년
    await insertParticipant(meetingId, minor, 'approved');

    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ adultOnly: true }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('adultOnly 켤 때 생년월일 미입력 참여자가 있으면 400', async () => {
    const { agent, userId } = await loginAgent('u-h14');
    const meetingId = await insertMeeting(userId, { type: 'small', adultOnly: false });
    const noBirth = await createUser('u-p14', { birthDate: null });
    await insertParticipant(meetingId, noBirth, 'approved');

    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ adultOnly: true }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('adultOnly 켤 때 활성 참여자가 전원 성인이면 200', async () => {
    const { agent, userId } = await loginAgent('u-h15');
    const meetingId = await insertMeeting(userId, { type: 'small', adultOnly: false });
    const adult = await createUser('u-p15', { birthDate: '1990-01-01' });
    await insertParticipant(meetingId, adult, 'approved');

    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ adultOnly: true }));
    expect(res.status).toBe(200);
    expect(res.body.data.adultOnly).toBe(true);
  });

  it('미성년이 rejected/cancelled면 활성 아님 → adultOnly 켜기 200', async () => {
    const { agent, userId } = await loginAgent('u-h16');
    const meetingId = await insertMeeting(userId, { type: 'small', adultOnly: false });
    const minor = await createUser('u-p16', { birthDate: '2015-01-01' });
    await insertParticipant(meetingId, minor, 'rejected');

    const res = await agent.patch(`/api/meetings/${meetingId}`).send(smallBody({ adultOnly: true }));
    expect(res.status).toBe(200);
  });
});
