import {
  AuthApiError,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createSupabaseAuthService } from './auth_service';

function createClientMock() {
  return {
    auth: {
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  } as unknown as Pick<SupabaseClient, 'auth'>;
}

describe('createSupabaseAuthService', () => {
  it('starts Google OAuth with the requested return URL', async () => {
    const client = createClientMock();
    vi.mocked(client.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com' },
      error: null,
    });
    const service = createSupabaseAuthService(client);

    await service.signInWithGoogle('http://localhost:5173');

    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
      options: { redirectTo: 'http://localhost:5173' },
      provider: 'google',
    });
  });

  it('surfaces a Google OAuth initiation error', async () => {
    const client = createClientMock();
    const error = new AuthApiError(
      'OAuth 공급자 응답 오류',
      502,
      'oauth_provider_error'
    );
    vi.mocked(client.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error,
    });
    const service = createSupabaseAuthService(client);

    await expect(
      service.signInWithGoogle('http://localhost:5173')
    ).rejects.toBe(error);
  });

  it('signs out only the current browser session and surfaces errors', async () => {
    const client = createClientMock();
    vi.mocked(client.auth.signOut).mockResolvedValue({ error: null });
    const service = createSupabaseAuthService(client);

    await service.signOut();

    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });

    const error = new AuthApiError('로그아웃 요청 오류', 502, 'sign_out_error');
    vi.mocked(client.auth.signOut).mockResolvedValue({ error });

    await expect(service.signOut()).rejects.toBe(error);
  });

  it('forwards restored sessions and releases the auth subscription', () => {
    const client = createClientMock();
    const unsubscribe = vi.fn();
    let notify: ((session: Session | null) => void) | undefined;
    vi.mocked(client.auth.onAuthStateChange).mockImplementation((callback) => {
      notify = (_session) => callback('INITIAL_SESSION', _session);

      return {
        data: {
          subscription: { callback, id: 'test', unsubscribe },
        },
      };
    });
    const service = createSupabaseAuthService(client);
    const listener = vi.fn();

    const release = service.subscribe(listener);
    notify?.(null);
    release();

    expect(listener).toHaveBeenCalledWith(null);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
