import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { DbPaper } from '../types/curate.types.js';

// Supabase Client 완벽 모킹 (Auth 포함)
vi.mock('../utils/supabaseClient.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-uuid', email: 'test@example.com' } },
        error: null
      })
    },
    from: vi.fn().mockReturnThis(),
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    then: vi.fn().mockImplementation((resolve) => {
      return Promise.resolve(resolve({ data: [], error: null }));
    })
  };

  return {
    __esModule: true,
    default: mockClient,
    getAuthenticatedSupabaseClient: vi.fn().mockReturnValue(mockClient)
  };
});

// S2 Service & Gemini Service 모킹 (테스트 시 외부 네트워크 429 차단)
vi.mock('../services/s2.service.js', () => ({
  fetchS2Papers: vi.fn().mockResolvedValue([
    {
      paperId: 'mock-s2-101',
      title: 'Deep Learning for Medical Imaging Optimization',
      authors: ['John Doe'],
      abstract: 'Abstract content',
      year: 2025,
      url: 'https://example.com/paper'
    }
  ])
}));

vi.mock('../services/gemini.service.js', () => ({
  transformQuery: vi.fn().mockResolvedValue({
    searchKeyword: 'Deep Learning Medical Imaging',
    reasoning: 'Transformed search query'
  }),
  evaluatePapersWithRAG: vi.fn().mockResolvedValue([
    {
      paperId: 'mock-s2-101',
      title: 'Deep Learning for Medical Imaging Optimization',
      authors: ['John Doe'],
      channel: 'IEEE TPAMI',
      year: 2025,
      matchScore: 95,
      url: 'https://example.com/paper',
      ovgBreakdown: {
        originality: 95,
        validity: 90,
        generalizability: 92
      },
      reasoning: '의료 영상 딥러닝 최적화 방법론 제시',
      insights: {
        background: '의료 영상 데이터의 고차원 특성과 노이즈 문제',
        coreMethod: '3D CNN 기반 노이즈 제거 어텐션 신경망',
        quantitativeResult: '기존 모델 대비 진단 정확도 14% 향상'
      }
    }
  ])
}));

describe('Backend Express Server E2E/Unit Tests', () => {
  it('1. GET / should return server status successfully', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toContain('Scholar-Sync AI Backend Server is running');
  });

  it('2. POST /api/curate should return papers and insights via live RAG pipeline', async () => {
    const res = await request(app)
      .post('/api/curate')
      .send({ query: 'Deep Learning for Medical Imaging' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.papers)).toBe(true);
    expect(res.body.data.papers.length).toBeLessThanOrEqual(5);
    if (res.body.data.papers.length > 0) {
      expect(res.body.data.papers[0].paperId).toBeDefined();
      expect(res.body.data.papers[0].insights).toBeDefined();
      expect(res.body.data.papers[0].insights.background).toBeDefined();
      expect(res.body.data.papers[0].insights.coreMethod).toBeDefined();
      expect(res.body.data.papers[0].insights.quantitativeResult).toBeDefined();
    }
  });

  it('3. POST /api/library should reject unauthenticated requests without Authorization header (401)', async () => {
    const res = await request(app)
      .post('/api/library')
      .send({
        paper: {
          paperId: 'paper-001',
          title: 'Lost in the Middle',
          authors: 'Nelson F. Liu',
          channel: 'arXiv',
          year: 2023,
          matchScore: 98,
          userId: 'test-user-uuid'
        }
      });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toContain('인증 토큰이 누락되었습니다');
  });

  it('4. POST /api/library should insert paper with valid Bearer token', async () => {
    const mockDbResponse: DbPaper[] = [
      {
        user_id: 'test-user-uuid',
        paper_id: 'paper-001',
        title: 'Lost in the Middle',
        authors: 'Nelson F. Liu',
        channel: 'arXiv',
        year: 2023,
        match_score: 98,
        created_at: '2026-07-22T00:00:00Z'
      }
    ];

    const supabase = (await import('../utils/supabaseClient.js')).default;
    // @ts-expect-error: Supabase Client "then" promise interface mapping does not match mock client signature perfectly
    vi.spyOn(supabase, 'then').mockImplementation((resolve: any) => {
      return Promise.resolve(resolve({ data: mockDbResponse, error: null }));
    });

    const res = await request(app)
      .post('/api/library')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({
        paper: {
          paperId: 'paper-001',
          title: 'Lost in the Middle',
          authors: 'Nelson F. Liu',
          channel: 'arXiv',
          year: 2023,
          matchScore: 98,
          userId: 'test-user-uuid'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.userId).toBe('test-user-uuid');
    expect(res.body.data.paperId).toBe('paper-001');
    expect(res.body.data.matchScore).toBe(98);
  });

  it('5. GET /api/library/:userId should retrieve authenticated user library', async () => {
    const mockDbResponse: DbPaper[] = [
      {
        user_id: 'test-user-uuid',
        paper_id: 'paper-001',
        title: 'Lost in the Middle',
        authors: 'Nelson F. Liu',
        channel: 'arXiv',
        year: 2023,
        match_score: 98,
        created_at: '2026-07-22T00:00:00Z'
      }
    ];

    const supabase = (await import('../utils/supabaseClient.js')).default;
    // @ts-expect-error: Supabase Client "then" promise interface mapping does not match mock client signature perfectly
    vi.spyOn(supabase, 'then').mockImplementation((resolve: any) => {
      return Promise.resolve(resolve({ data: mockDbResponse, error: null }));
    });

    const res = await request(app)
      .get('/api/library/test-user-uuid')
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].userId).toBe('test-user-uuid');
    expect(res.body.data[0].paperId).toBe('paper-001');
  });

  it('6. DELETE /api/library/:userId/:paperId should delete paper with valid Bearer token', async () => {
    const supabase = (await import('../utils/supabaseClient.js')).default;
    // @ts-expect-error: Supabase Client "then" promise interface mapping does not match mock client signature perfectly
    vi.spyOn(supabase, 'then').mockImplementation((resolve: any) => {
      return Promise.resolve(resolve({ data: null, error: null }));
    });

    const res = await request(app)
      .delete('/api/library/test-user-uuid/paper-001')
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Paper deleted successfully.');
  });
});
