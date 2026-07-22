import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { DbPaper } from '../app.js';

// Supabase Client 완벽 모킹 (Fluent API 체이닝 및 then을 활용한 Promise 반환 모방)
vi.mock('../utils/supabaseClient.js', () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();

  const mockClient = {
    from: vi.fn().mockReturnThis(),
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    // 최종 execution을 모방하기 위해 Promise의 then 인터페이스 구현
    then: vi.fn().mockImplementation((resolve) => {
      // 기본 mock 데이터 반환 설정
      return Promise.resolve(resolve({ data: [], error: null }));
    })
  };

  return {
    __esModule: true,
    default: mockClient
  };
});

describe('Backend Express Server E2E/Unit Tests', () => {
  it('1. GET / should return server status successfully', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toContain('Scholar-Sync AI Backend Server is running');
  });

  it('2. POST /api/curate should return mock papers and insights', async () => {
    const res = await request(app)
      .post('/api/curate')
      .send({ query: 'test query' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.papers.length).toBeGreaterThan(0);
    // id 유령 필드 배제 및 paperId 활성화 확인
    expect(res.body.data.papers[0].paperId).toBe('paper-001');
    expect(res.body.data.papers[0].insights).toBeDefined();
  });

  it('3. POST /api/library should insert paper and return camelCase LibraryItem', async () => {
    // mockClient 가로채서 insert 시뮬레이션 성공 데이터 주입
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

    // supabaseClient 가로채기
    const supabase = (await import('../utils/supabaseClient.js')).default;
    vi.spyOn(supabase, 'then').mockImplementation((resolve: any) => {
      return Promise.resolve(resolve({ data: mockDbResponse, error: null }));
    });

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

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    // camelCase DTO 변환 검증 (id 유령 필드 부재 확인)
    expect(res.body.data.id).toBeUndefined();
    expect(res.body.data.userId).toBe('test-user-uuid');
    expect(res.body.data.paperId).toBe('paper-001');
    expect(res.body.data.matchScore).toBe(98);
  });

  it('4. GET /api/library/:userId should retrieve user library', async () => {
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
    vi.spyOn(supabase, 'then').mockImplementation((resolve: any) => {
      return Promise.resolve(resolve({ data: mockDbResponse, error: null }));
    });

    const res = await request(app).get('/api/library/test-user-uuid');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].userId).toBe('test-user-uuid');
    expect(res.body.data[0].paperId).toBe('paper-001');
  });

  it('5. DELETE /api/library/:userId/:paperId should delete paper from library', async () => {
    const supabase = (await import('../utils/supabaseClient.js')).default;
    vi.spyOn(supabase, 'then').mockImplementation((resolve: any) => {
      return Promise.resolve(resolve({ data: null, error: null }));
    });

    const res = await request(app).delete('/api/library/test-user-uuid/paper-001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Paper deleted successfully.');
  });
});
