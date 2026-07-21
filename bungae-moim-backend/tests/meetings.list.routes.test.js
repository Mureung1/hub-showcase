const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { PAGE_SIZE } = require('../src/services/meetingService');

afterAll(async () => {
  await pool.end();
});

// 테스트용 host 사용자 1명을 만들고 id를 돌려준다.
async function createHost(providerId = 'list-host') {
  const { rows } = await pool.query(
    `INSERT INTO users (provider, provider_id, email, nickname)
     VALUES ('google', $1, $2, '목록호스트')
     RETURNING id`,
    [providerId, `${providerId}@test.com`]
  );
  return Number(rows[0].id);
}

// 모임 1건을 원하는 값으로 직접 INSERT한다 (과거 일정/취소 상태 등 API로는
// 만들기 까다로운 케이스를 세팅하기 위해 서비스가 아닌 raw insert를 쓴다).
async function insertMeeting(hostId, overrides = {}) {
  const m = {
    type: 'flash',
    title: '테스트 모임',
    category: '운동',
    description: null,
    regionSido: '서울특별시',
    regionSigungu: '강남구',
    regionEupmyeondong: null,
    startAt: '2030-01-01T10:00:00+09:00',
    endAt: null,
    capacity: 4,
    adultOnly: false,
    openChatUrl: 'https://open.kakao.com/o/test',
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
  const id = Number(rows[0].id);

  // created_at은 DB 기본값(now())이라 INSERT 컬럼 목록에 없다. sort=recent(등록순) 테스트처럼
  // "등록 시각"을 직접 통제해야 하는 경우에만, INSERT 후 별도 UPDATE로 덮어쓴다.
  if (overrides.createdAt) {
    await pool.query('UPDATE meetings SET created_at = $1 WHERE id = $2', [overrides.createdAt, id]);
  }

  return id;
}

// 모임 참여자 1건을 원하는 status로 직접 INSERT한다.
async function insertParticipant(meetingId, userId, status) {
  await pool.query(
    'INSERT INTO meeting_participants (meeting_id, user_id, status) VALUES ($1,$2,$3)',
    [meetingId, userId, status]
  );
}

describe('GET /api/meetings', () => {
  it('모임이 없으면 빈 목록과 page 정보를 반환한다', async () => {
    const res = await request(app).get('/api/meetings');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.totalPages).toBe(0);
  });

  it('로그인 없이도 모집 중인 모임을 조회할 수 있다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '풋살 하실 분' });

    const res = await request(app).get('/api/meetings');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].title).toBe('풋살 하실 분');
  });

  it('목록 응답에는 openChatUrl을 노출하지 않는다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '오픈채팅 비노출 확인' });

    const res = await request(app).get('/api/meetings');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).not.toHaveProperty('openChatUrl');
  });

  it('지난 일정(start_at 과거)의 모임은 목록에서 제외된다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '미래 모임', startAt: '2030-01-01T10:00:00+09:00' });
    await insertMeeting(host, { title: '지난 모임', startAt: '2000-01-01T10:00:00+09:00' });

    const res = await request(app).get('/api/meetings');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toContain('미래 모임');
    expect(titles).not.toContain('지난 모임');
  });

  it('진행 중인 small 모임은 endAt이 미래면 포함된다', async () => {
    const host = await createHost();
    await insertMeeting(host, {
      type: 'small',
      title: '진행중 소모임',
      capacity: null,
      startAt: '2000-01-01T10:00:00+09:00', // 시작은 과거
      endAt: '2030-12-31T10:00:00+09:00', // 종료는 미래
    });

    const res = await request(app).get('/api/meetings');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toContain('진행중 소모임');
  });

  it('cancelled 상태의 모임은 목록에서 제외된다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '살아있는 모임' });
    await insertMeeting(host, { title: '취소된 모임', status: 'cancelled' });

    const res = await request(app).get('/api/meetings');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toContain('살아있는 모임');
    expect(titles).not.toContain('취소된 모임');
  });

  it('type 필터로 flash/small을 구분해 조회한다', async () => {
    const host = await createHost();
    await insertMeeting(host, { type: 'flash', title: '번개모임', capacity: 4 });
    await insertMeeting(host, {
      type: 'small', title: '소모임', capacity: null, endAt: '2030-12-31T10:00:00+09:00',
    });

    const res = await request(app).get('/api/meetings?type=small');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toEqual(['소모임']);
  });

  it('category 필터가 정확히 동작한다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '운동모임', category: '운동' });
    await insertMeeting(host, { title: '스터디모임', category: '스터디' });

    const res = await request(app).get('/api/meetings?category=스터디');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toEqual(['스터디모임']);
  });

  it('regionSigungu 필터가 정확히 동작한다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '강남모임', regionSigungu: '강남구' });
    await insertMeeting(host, { title: '마포모임', regionSigungu: '마포구' });

    const res = await request(app).get('/api/meetings?regionSigungu=마포구');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toEqual(['마포모임']);
  });

  it('keyword로 제목/설명을 부분 검색한다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '주말 등산 같이 가요' });
    await insertMeeting(host, { title: '평일 저녁 코딩', description: '함께 등산도 가능' });
    await insertMeeting(host, { title: '보드게임 모임' });

    const res = await request(app).get('/api/meetings?keyword=등산');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toContain('주말 등산 같이 가요');
    expect(titles).toContain('평일 저녁 코딩');
    expect(titles).not.toContain('보드게임 모임');
  });

  it('status=recruiting 필터는 closed 모임을 제외한다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '모집중 모임', status: 'recruiting' });
    await insertMeeting(host, { title: '마감된 모임', status: 'closed' });

    const res = await request(app).get('/api/meetings?status=recruiting');
    const titles = res.body.data.items.map((m) => m.title);
    expect(titles).toEqual(['모집중 모임']);
    expect(res.body.data.total).toBe(1);
  });

  it('허용되지 않은 status 값은 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app).get('/api/meetings?status=finished');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('페이지네이션: 한 페이지 크기를 넘으면 totalPages가 늘고 page로 나눠 받는다', async () => {
    const host = await createHost();
    const total = PAGE_SIZE + 3;
    for (let i = 0; i < total; i++) {
      // start_at을 조금씩 다르게 줘서 정렬 순서를 안정적으로 만든다.
      await insertMeeting(host, {
        title: `모임 ${String(i).padStart(2, '0')}`,
        startAt: `2030-02-${String((i % 27) + 1).padStart(2, '0')}T10:00:00+09:00`,
      });
    }

    const page1 = await request(app).get('/api/meetings?page=1');
    expect(page1.body.data.items).toHaveLength(PAGE_SIZE);
    expect(page1.body.data.totalPages).toBe(2);
    expect(page1.body.data.page).toBe(1);
    // total은 items.length(20, LIMIT에 잘린 값)와 달라야 한다 — total: items.length라는
    // 잘못된 구현으로는 이 단언이 실패한다. total이 존재해야 하는 유일한 이유가 바로
    // "잘려도 정확한 총 개수를 준다"이므로, 둘이 갈라지는 지점을 직접 확인한다.
    expect(page1.body.data.total).toBe(PAGE_SIZE + 3);
    expect(page1.body.data.total).not.toBe(page1.body.data.items.length);

    const page2 = await request(app).get('/api/meetings?page=2');
    expect(page2.body.data.items).toHaveLength(3);
    expect(page2.body.data.page).toBe(2);
    expect(page2.body.data.total).toBe(PAGE_SIZE + 3);
  });

  it('page가 비정상 값이어도 500 없이 조용히 1페이지로 처리한다', async () => {
    const host = await createHost();
    await insertMeeting(host, { title: '모임' });

    // 안전 정수 범위를 훌쩍 넘는 값. 수정 전에는 Number.parseInt를 그대로 통과시켜
    // Postgres bigint 범위 초과 500 에러(원문 노출)로 이어졌다.
    const huge = await request(app).get('/api/meetings?page=99999999999999999999');
    expect(huge.status).toBe(200);
    expect(huge.body.data.page).toBe(1);

    // "1abc"는 Number.parseInt가 뒷부분을 조용히 버리고 1을 반환해버리던 값이다.
    // 결과 자체는 우연히 1페이지와 같지만, 500이 나지 않고 명시적으로 기본값으로
    // 떨어지는지(에러가 아닌지)를 확인한다.
    const nonNumeric = await request(app).get('/api/meetings?page=1abc');
    expect(nonNumeric.status).toBe(200);
    expect(nonNumeric.body.data.page).toBe(1);

    const negative = await request(app).get('/api/meetings?page=-1');
    expect(negative.status).toBe(200);
    expect(negative.body.data.page).toBe(1);

    const zero = await request(app).get('/api/meetings?page=0');
    expect(zero.status).toBe(200);
    expect(zero.body.data.page).toBe(1);
  });

  it('sort=recent는 created_at 내림차순으로 정렬한다 (start_at 순서와는 반대)', async () => {
    const host = await createHost();
    // start_at ASC로는 A, B, C 순서이지만, created_at은 그 반대(C, B, A)가 되도록
    // 일부러 어긋나게 만든다. 이렇게 해야 "여전히 start_at 순으로 정렬하는" 잘못된
    // 구현에서 이 테스트가 실제로 실패한다.
    const a = await insertMeeting(host, {
      title: '모임A',
      startAt: '2030-01-01T10:00:00+09:00',
      createdAt: new Date('2020-01-01T00:00:00Z'),
    });
    const b = await insertMeeting(host, {
      title: '모임B',
      startAt: '2030-01-02T10:00:00+09:00',
      createdAt: new Date('2020-01-02T00:00:00Z'),
    });
    const c = await insertMeeting(host, {
      title: '모임C',
      startAt: '2030-01-03T10:00:00+09:00',
      createdAt: new Date('2020-01-03T00:00:00Z'),
    });
    void a;
    void b;
    void c;

    const defaultOrder = await request(app).get('/api/meetings');
    expect(defaultOrder.body.data.items.map((m) => m.title)).toEqual(['모임A', '모임B', '모임C']);

    const recentOrder = await request(app).get('/api/meetings?sort=recent');
    expect(recentOrder.body.data.items.map((m) => m.title)).toEqual(['모임C', '모임B', '모임A']);
  });

  it('허용되지 않은 sort 값은 VALIDATION_ERROR를 반환한다', async () => {
    const res = await request(app).get('/api/meetings?sort=popular');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('목록 항목에 confirmedCount가 실린다(confirmed+approved만 셈)', async () => {
    const host = await createHost('list-count-host');
    const meetingId = await insertMeeting(host, { capacity: 4 });
    const u1 = await createHost('list-count-1');
    const u2 = await createHost('list-count-2');
    const u3 = await createHost('list-count-3');
    await insertParticipant(meetingId, u1, 'confirmed');
    await insertParticipant(meetingId, u2, 'approved');
    await insertParticipant(meetingId, u3, 'pending'); // 안 세어야 함

    const res = await request(app).get('/api/meetings');
    const item = res.body.data.items.find((m) => m.id === meetingId);
    expect(item.confirmedCount).toBe(2);
  });

  it('참여자가 없는 모임의 confirmedCount는 0이다', async () => {
    const host = await createHost('list-count-empty');
    const meetingId = await insertMeeting(host);
    const res = await request(app).get('/api/meetings');
    const item = res.body.data.items.find((m) => m.id === meetingId);
    expect(item.confirmedCount).toBe(0);
  });
});
