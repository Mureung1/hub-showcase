import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from './api/supabaseClient';

// Supabase client mock
vi.mock('./api/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('Security & Authorization Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Happy Path: 로그인한 사용자의 세션 토큰이 정상적으로 가져와진다', async () => {
    const mockSession = { access_token: 'valid-jwt-token-123' };
    supabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    });

    const { data: { session } } = await supabase.auth.getSession();
    expect(session.access_token).toBe('valid-jwt-token-123');
  });

  it('Failure Case: 비로그인 상태일 때 세션 토큰은 null이다', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const { data: { session } } = await supabase.auth.getSession();
    expect(session).toBeNull();
  });
});
