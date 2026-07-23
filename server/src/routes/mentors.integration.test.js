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
// resolve되는 범용 thenable 빌더 (single() 유무와 상관없이 동작).
const buildThenableQuery = (result) => {
  const query = { then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
  ['select', 'eq', 'single'].forEach((method) => {
    query[method] = vi.fn(() => query);
  });
  return query;
};

const MENTEE_TOKEN = 'Bearer mentee-token';

const mockAuthenticatedMentee = () => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'mentee-1', email: 'mentee@example.com' } },
    error: null,
  });
};

const mockProfilesTable = () =>
  buildProfilesQuery({
    data: { id: 'mentee-1', role: 'mentee', name: '홍길동', nickname: '길동' },
    error: null,
  });

describe('GET /api/mentors - 빈 목록 (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedMentee();
  });

  it('멘토가 한 명도 없으면 빈 배열과 total 0을 반환한다', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      if (table === 'mentor_profiles') return buildThenableQuery({ data: [], error: null });
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app).get('/api/mentors').set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { total: 0 } });
  });
});

describe('GET /api/mentors/:mentorId - 존재하지 않는 멘토 (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedMentee();
  });

  it('존재하지 않는 멘토 id로 조회하면 404 MENTOR_NOT_FOUND를 반환한다', async () => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'profiles') return mockProfilesTable();
      if (table === 'mentor_profiles') {
        return buildThenableQuery({ data: null, error: { message: 'no rows found' } });
      }
      throw new Error(`예상치 못한 테이블 조회: ${table}`);
    });

    const res = await request(app)
      .get('/api/mentors/non-existent-mentor-id')
      .set('Authorization', MENTEE_TOKEN);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('MENTOR_NOT_FOUND');
    expect(res.body.error.message).toBe('멘토 정보를 찾을 수 없습니다.');
  });
});
