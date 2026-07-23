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

// authenticate 미들웨어가 주어진 role의 사용자로 인증에 성공하도록 mock을 구성한다.
const mockAuthenticatedUser = (role) => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'user@example.com' } },
    error: null,
  });
  mockSupabase.from.mockReturnValue(
    buildProfilesQuery({
      data: { id: 'user-1', role, name: '홍길동', nickname: '길동' },
      error: null,
    }),
  );
};

describe('역할별 권한 (requireRole) integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('멘티 토큰으로 GET /api/mentors/me(멘토 전용)에 접근하면 403 FORBIDDEN을 반환한다', async () => {
    mockAuthenticatedUser('mentee');

    const res = await request(app).get('/api/mentors/me').set('Authorization', 'Bearer token-mentee');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('접근 권한이 없습니다.');
  });

  it('멘토 토큰으로 GET /api/mentees/me(멘티 전용)에 접근하면 403 FORBIDDEN을 반환한다', async () => {
    mockAuthenticatedUser('mentor');

    const res = await request(app).get('/api/mentees/me').set('Authorization', 'Bearer token-mentor');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('접근 권한이 없습니다.');
  });

  it('멘토 토큰으로 GET /api/mentors(멘티 전용 목록 조회)에 접근하면 403 FORBIDDEN을 반환한다', async () => {
    mockAuthenticatedUser('mentor');

    const res = await request(app).get('/api/mentors').set('Authorization', 'Bearer token-mentor');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toBe('접근 권한이 없습니다.');
  });
});
