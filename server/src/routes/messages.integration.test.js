import { createRequire } from 'module';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// app.js는 CommonJS다. 네이티브 require를 명시적으로 사용해 db/supabase.js와 app.js를
// 같은 require 캐시로 로드해서, __setTestClients로 주입한 mock이 실제로 적용되게 한다.
// (자세한 이유는 auth.routes.integration.test.js 상단 주석 참고)
const require = createRequire(import.meta.url);
const { __setTestClients } = require('../db/supabase');

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
__setTestClients({
  supabase: mockSupabase,
  supabaseAnon: {},
});

const app = require('../app');

// supabase.from('profiles').select(...).eq(...).single() 체인을 흉내내는 헬퍼.
const buildProfilesQuery = (result) => {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue(result);
  return query;
};

// 실제 supabase-js 쿼리 빌더처럼, 체인 모양과 무관하게 await 시점에 정해진 값으로
// resolve되는 범용 thenable 빌더 (single()/order()/limit()/or() 등 어떤 조합도 지원).
const buildThenableQuery = (result) => {
  const query = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  ['select', 'eq', 'order', 'limit', 'or', 'insert', 'single'].forEach((method) => {
    query[method] = vi.fn(() => query);
  });
  return query;
};

const MENTEE_TOKEN = 'Bearer mentee-1-token';
const MENTOR_TOKEN = 'Bearer mentor-1-token';
const OTHER_TOKEN = 'Bearer other-mentee-token';

const APPLICATION_ID = 'application-1';

const mockAuthenticatedUser = (id, role) => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id, email: `${id}@example.com` } },
    error: null,
  });
  return buildProfilesQuery({ data: { id, role, name: 'Tester', nickname: 'Tester' }, error: null });
};

const setupMocks = ({ applicationStatus = 'confirmed', profilesQuery, messagesQuery }) => {
  mockSupabase.from.mockImplementation((table) => {
    if (table === 'profiles') return profilesQuery;
    if (table === 'applications') {
      return buildThenableQuery({
        data: {
          id: APPLICATION_ID,
          mentee_id: 'mentee-1',
          accepted_mentor_id: 'mentor-1',
          status: applicationStatus,
        },
        error: null,
      });
    }
    if (table === 'messages') return messagesQuery;
    throw new Error(`예상치 못한 테이블 조회: ${table}`);
  });
};

describe('POST /api/applications/:applicationId/messages (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('참여자가 아닌 사용자가 호출하면 403 FORBIDDEN을 반환한다', async () => {
    const profilesQuery = mockAuthenticatedUser('other-mentee', 'mentee');
    setupMocks({ profilesQuery, messagesQuery: buildThenableQuery({ data: null, error: null }) });

    const res = await request(app)
      .post(`/api/applications/${APPLICATION_ID}/messages`)
      .set('Authorization', OTHER_TOKEN)
      .send({ body: '안녕하세요' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('confirmed 상태가 아닌 신청에 보내면 409 APPLICATION_NOT_CONFIRMED를 반환한다', async () => {
    const profilesQuery = mockAuthenticatedUser('mentee-1', 'mentee');
    setupMocks({
      applicationStatus: 'pending',
      profilesQuery,
      messagesQuery: buildThenableQuery({ data: null, error: null }),
    });

    const res = await request(app)
      .post(`/api/applications/${APPLICATION_ID}/messages`)
      .set('Authorization', MENTEE_TOKEN)
      .send({ body: '안녕하세요' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPLICATION_NOT_CONFIRMED');
  });

  it('공백만 있는 body를 보내면 400 VALIDATION_ERROR를 반환한다', async () => {
    const profilesQuery = mockAuthenticatedUser('mentee-1', 'mentee');
    setupMocks({ profilesQuery, messagesQuery: buildThenableQuery({ data: null, error: null }) });

    const res = await request(app)
      .post(`/api/applications/${APPLICATION_ID}/messages`)
      .set('Authorization', MENTEE_TOKEN)
      .send({ body: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('body');
  });

  it('정상 흐름: 참여자가 confirmed 신청에 메시지를 보내면 201과 생성된 메시지를 반환한다', async () => {
    const profilesQuery = mockAuthenticatedUser('mentee-1', 'mentee');
    setupMocks({
      profilesQuery,
      messagesQuery: buildThenableQuery({
        data: {
          id: 'message-1',
          application_id: APPLICATION_ID,
          sender_id: 'mentee-1',
          body: '안녕하세요',
          created_at: '2026-07-24T00:00:00.000Z',
          profiles: { name: '테스트멘티' },
        },
        error: null,
      }),
    });

    const res = await request(app)
      .post(`/api/applications/${APPLICATION_ID}/messages`)
      .set('Authorization', MENTEE_TOKEN)
      .send({ body: '안녕하세요' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: {
        id: 'message-1',
        applicationId: APPLICATION_ID,
        senderId: 'mentee-1',
        senderName: '테스트멘티',
        body: '안녕하세요',
        createdAt: '2026-07-24T00:00:00.000Z',
      },
    });
  });
});

describe('GET /api/applications/:applicationId/messages (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('존재하지 않는 신청이면 404 APPLICATION_NOT_FOUND를 반환한다 (라우트가 실제로 마운트되어 있는지도 함께 확인)', async () => {
    const profilesQuery = mockAuthenticatedUser('mentee-1', 'mentee');
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return profilesQuery;
      if (table === 'applications') return buildThenableQuery({ data: null, error: { message: 'no rows' } });
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app)
      .get('/api/applications/non-existent-application/messages')
      .set('Authorization', MENTEE_TOKEN);

    // 404가 아니라 NOT_FOUND 바디가 오는 것 자체가, 라우트가 진짜 핸들러까지 연결됐다는 증거다
    // (마운트가 안 되어 있었다면 app.js의 공용 404 핸들러가 code: 'NOT_FOUND'를 반환했을 것).
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('limit=1로 호출하면 메시지가 2개 이상일 때 meta.hasMore가 true다', async () => {
    const profilesQuery = mockAuthenticatedUser('mentee-1', 'mentee');
    // pageSize(1) + 1개를 반환하도록 mock해서 "더 있음"을 흉내낸다.
    setupMocks({
      profilesQuery,
      messagesQuery: buildThenableQuery({
        data: [
          {
            id: 'message-2',
            application_id: APPLICATION_ID,
            sender_id: 'mentor-1',
            body: '두 번째 메시지',
            created_at: '2026-07-24T00:01:00.000Z',
            profiles: { name: '테스트멘토' },
          },
          {
            id: 'message-1',
            application_id: APPLICATION_ID,
            sender_id: 'mentee-1',
            body: '첫 번째 메시지',
            created_at: '2026-07-24T00:00:00.000Z',
            profiles: { name: '테스트멘티' },
          },
        ],
        error: null,
      }),
    });

    const res = await request(app)
      .get(`/api/applications/${APPLICATION_ID}/messages?limit=1`)
      .set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.meta.hasMore).toBe(true);
    expect(res.body.meta.nextCursor).toBeTruthy();
    expect(res.body.data).toHaveLength(1);
    // limit=1이면 최신 1건(message-2)만 페이지에 남고, 더 있는지 확인용으로 하나 더
    // 가져왔던 message-1은 다음 페이지(cursor)로 밀려난다.
    expect(res.body.data[0].id).toBe('message-2');
  });

  it('참여자가 아닌 사용자가 조회하면 403 FORBIDDEN을 반환한다', async () => {
    const profilesQuery = mockAuthenticatedUser('other-mentee', 'mentee');
    setupMocks({ profilesQuery, messagesQuery: buildThenableQuery({ data: [], error: null }) });

    const res = await request(app)
      .get(`/api/applications/${APPLICATION_ID}/messages`)
      .set('Authorization', OTHER_TOKEN);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
