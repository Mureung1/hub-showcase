const { getServerSupabaseClientMock, redirectMock } = vi.hoisted(() => ({
  getServerSupabaseClientMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('../../src/web/lib/supabase/server', () => ({
  getServerSupabaseClient: getServerSupabaseClientMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

import { logoutAction } from '../../src/web/actions/auth-actions';
import { initialActionState } from '../../src/web/errors/action-state';

describe('logoutAction', () => {
  beforeEach(() => {
    getServerSupabaseClientMock.mockReset();
    redirectMock.mockReset();
  });

  it('returns an error without redirecting when the auth client is unavailable', async () => {
    getServerSupabaseClientMock.mockResolvedValue(null);

    const result = await logoutAction(initialActionState, new FormData());

    expect(result).toEqual({
      status: 'error',
      message: '인증 서비스가 구성되지 않았습니다.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('returns an error without redirecting when Supabase sign out fails', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: new Error('network failure') });
    getServerSupabaseClientMock.mockResolvedValue({ auth: { signOut } });

    const result = await logoutAction(initialActionState, new FormData());

    expect(signOut).toHaveBeenCalledOnce();
    expect(result).toEqual({
      status: 'error',
      message: '로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('redirects home after signing out successfully', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    getServerSupabaseClientMock.mockResolvedValue({ auth: { signOut } });

    await logoutAction(initialActionState, new FormData());

    expect(signOut).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith('/');
  });
});
