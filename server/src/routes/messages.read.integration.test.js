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

const buildProfilesQuery = (result) => {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue(result);
  return query;
};

const buildThenableQuery = (result) => {
  const query = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  ['select', 'eq', 'order', 'limit', 'or', 'insert', 'upsert', 'single'].forEach((method) => {
    query[method] = vi.fn(() => query);
  });
  return query;
};

const MENTEE_TOKEN = 'Bearer mentee-1-token';
const OTHER_TOKEN = 'Bearer other-mentee-token';

const APPLICATION_ID = 'application-1';

const mockAuthenticatedUser = (id, role) => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id, email: `${id}@example.com` } },
    error: null,
  });
  return buildProfilesQuery({ data: { id, role, name: 'Tester', nickname: 'Tester' }, error: null });
};

describe('POST /api/applications/:applicationId/messages/read (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('참여자가 아닌 사용자가 호출하면 403 FORBIDDEN을 반환하고 message_read_states는 갱신하지 않는다', async () => {
    const profilesQuery = mockAuthenticatedUser('other-mentee', 'mentee');
    let readStatesQuery;
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return profilesQuery;
      if (table === 'applications') {
        return buildThenableQuery({
          data: {
            id: APPLICATION_ID,
            mentee_id: 'mentee-1',
            accepted_mentor_id: 'mentor-1',
            status: 'confirmed',
          },
          error: null,
        });
      }
      if (table === 'message_read_states') {
        readStatesQuery = buildThenableQuery({ error: null });
        return readStatesQuery;
      }
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app)
      .post(`/api/applications/${APPLICATION_ID}/messages/read`)
      .set('Authorization', OTHER_TOKEN);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(readStatesQuery).toBeUndefined();
  });

  it('존재하지 않는 신청이면 404 APPLICATION_NOT_FOUND를 반환한다', async () => {
    const profilesQuery = mockAuthenticatedUser('mentee-1', 'mentee');
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return profilesQuery;
      if (table === 'applications') return buildThenableQuery({ data: null, error: { message: 'no rows' } });
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app)
      .post('/api/applications/non-existent-application/messages/read')
      .set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('참여자(신청 멘티)가 호출하면 200을 반환하고 본인 명의로 message_read_states를 upsert한다', async () => {
    const profilesQuery = mockAuthenticatedUser('mentee-1', 'mentee');
    let readStatesQuery;
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return profilesQuery;
      if (table === 'applications') {
        return buildThenableQuery({
          data: {
            id: APPLICATION_ID,
            mentee_id: 'mentee-1',
            accepted_mentor_id: 'mentor-1',
            status: 'confirmed',
          },
          error: null,
        });
      }
      if (table === 'message_read_states') {
        readStatesQuery = buildThenableQuery({ error: null });
        return readStatesQuery;
      }
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app)
      .post(`/api/applications/${APPLICATION_ID}/messages/read`)
      .set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.applicationId).toBe(APPLICATION_ID);
    expect(res.body.data.lastReadAt).toEqual(expect.any(String));
    expect(readStatesQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ application_id: APPLICATION_ID, user_id: 'mentee-1' }),
      { onConflict: 'application_id,user_id' },
    );
  });
});
