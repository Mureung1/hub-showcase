import { createRequire } from 'module';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// app.js는 CommonJS다. `await import('../app')`로 동적 로드하면 Vitest의 계측된
// ESM 모듈 그래프를 벗어나 Node의 네이티브 require 캐시로 전환되면서, 이 테스트 파일이
// 정적/동적 import로 얻은 '../db/supabase'와 app.js 내부에서 require된 '../db/supabase'가
// 서로 다른 모듈 인스턴스가 되어버린다(직접 확인함). 네이티브 require를 명시적으로 사용해
// db/supabase.js와 app.js를 같은 require 캐시로 로드해서 이 문제를 피한다.
const require = createRequire(import.meta.url);
const { __setTestClients } = require('../db/supabase');

const mockSupabase = {
  auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn() }, getUser: vi.fn() },
  from: vi.fn(),
};
const mockSupabaseAnon = {
  auth: { signInWithPassword: vi.fn() },
};
__setTestClients({
  supabase: mockSupabase,
  supabaseAnon: mockSupabaseAnon,
});

// supabase.from('profiles').select(...).eq(...).single() 체인을 흉내내는 헬퍼.
const buildProfilesQuery = (result) => {
  const query = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue(result);
  return query;
};

const app = require('../app');

const validPayload = {
  email: 'mentee@example.com',
  password: 'password123',
  name: '홍길동',
  nickname: '길동',
  school: '서울대학교',
  major: '컴퓨터공학',
  grade: '2',
  enrollmentStatus: 'enrolled',
};

describe('POST /api/auth/signup/mentee (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 입력이면 201과 생성된 사용자 정보를 반환한다', async () => {
    mockSupabase.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const res = await request(app).post('/api/auth/signup/mentee').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: {
        user: {
          id: 'user-1',
          email: validPayload.email,
          role: 'mentee',
          name: validPayload.name,
          nickname: validPayload.nickname,
        },
      },
    });
    expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
      email: validPayload.email,
      password: validPayload.password,
      email_confirm: true,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabase.from).toHaveBeenCalledWith('mentee_profiles');
  });

  it('grade가 유효하지 않으면 400을 반환하고 Supabase는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/auth/signup/mentee')
      .send({ ...validPayload, grade: '99' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('grade');
    expect(mockSupabase.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('enrollmentStatus가 유효하지 않으면 400을 반환하고 Supabase는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/auth/signup/mentee')
      .send({ ...validPayload, enrollmentStatus: 'unknown' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('enrollmentStatus');
    expect(mockSupabase.auth.admin.createUser).not.toHaveBeenCalled();
  });
});

const validMentorPayload = {
  email: 'mentor@example.com',
  password: 'password123',
  name: '김민준',
  nickname: '민준',
  school: '서울대학교',
  major: '컴퓨터공학',
  academicStatus: '박사과정',
  program: '정규 멘토링',
  lab: '인공지능 연구실',
  introduction: 'AI를 연구합니다',
  detailedIntroduction: '딥러닝과 자연어처리를 연구합니다',
  availableTime: '평일 저녁',
  researchFields: ['머신러닝', '딥러닝', '자연어처리'],
  counselingFields: ['진로상담'],
  careerHighlights: ['논문 3편 게재'],
  internationalActivities: ['국제 학회 발표'],
};

describe('POST /api/auth/signup/mentor (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 입력이면 201과 생성된 사용자 정보를 반환한다', async () => {
    mockSupabase.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'mentor-user-1' } },
      error: null,
    });
    mockSupabase.from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const res = await request(app).post('/api/auth/signup/mentor').send(validMentorPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: {
        user: {
          id: 'mentor-user-1',
          email: validMentorPayload.email,
          role: 'mentor',
          name: validMentorPayload.name,
          nickname: validMentorPayload.nickname,
        },
      },
    });
    expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith({
      email: validMentorPayload.email,
      password: validMentorPayload.password,
      email_confirm: true,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabase.from).toHaveBeenCalledWith('mentor_profiles');
  });

  it('researchFields가 3개 미만이면 400을 반환하고 Supabase는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/auth/signup/mentor')
      .send({ ...validMentorPayload, researchFields: ['머신러닝', '딥러닝'] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('researchFields');
    expect(mockSupabase.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('counselingFields가 비어있으면 400을 반환하고 Supabase는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/auth/signup/mentor')
      .send({ ...validMentorPayload, counselingFields: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('counselingFields');
    expect(mockSupabase.auth.admin.createUser).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 이메일/비밀번호면 200과 함께 토큰과 사용자 정보를 반환한다', async () => {
    mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'access-token-1', refresh_token: 'refresh-token-1', expires_in: 3600 },
        user: { id: 'user-1', email: 'mentee@example.com' },
      },
      error: null,
    });
    mockSupabase.from.mockReturnValue(
      buildProfilesQuery({
        data: { id: 'user-1', role: 'mentee', name: '홍길동', nickname: '길동' },
        error: null,
      }),
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mentee@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        accessToken: 'access-token-1',
        refreshToken: 'refresh-token-1',
        expiresIn: 3600,
        user: {
          id: 'user-1',
          email: 'mentee@example.com',
          role: 'mentee',
          name: '홍길동',
          nickname: '길동',
        },
      },
    });
    expect(mockSupabaseAnon.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'mentee@example.com',
      password: 'password123',
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  it('이메일 또는 비밀번호가 틀리면 401 INVALID_CREDENTIALS를 반환한다', async () => {
    mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mentee@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('이메일 형식이 아니면 400 VALIDATION_ERROR를 반환하고 Supabase는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('email');
    expect(mockSupabaseAnon.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('비밀번호가 비어있으면 400 VALIDATION_ERROR를 반환하고 Supabase는 호출하지 않는다', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mentee@example.com', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.field).toBe('password');
    expect(mockSupabaseAnon.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/me (미인증 요청) (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Authorization 헤더가 없으면 401 UNAUTHORIZED를 반환한다', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('로그인이 필요합니다.');
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('토큰이 유효하지 않거나 만료되었으면 401 UNAUTHORIZED를 반환한다', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } });

    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('유효하지 않거나 만료된 토큰입니다.');
    expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('invalid-token');
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('토큰은 유효하지만 profiles row가 없으면 401 UNAUTHORIZED를 반환한다', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'mentee@example.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValue(buildProfilesQuery({ data: null, error: { message: 'not found' } }));

    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('사용자 프로필을 찾을 수 없습니다.');
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });
});
