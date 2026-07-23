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
  auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn() } },
  from: vi.fn(),
};
__setTestClients({
  supabase: mockSupabase,
  supabaseAnon: { auth: { signInWithPassword: vi.fn() } },
});

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
