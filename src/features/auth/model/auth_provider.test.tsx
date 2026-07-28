/* @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MobileOAuthContext } from '@/shared/capacitor';

import type { AuthService, AuthSession } from '../api/auth_service';
import { AuthProvider } from './auth_provider';
import { useAuth } from './use_auth';

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

function createServiceMock() {
  let listener: ((session: AuthSession | null) => void) | undefined;
  let signInFailureListener:
    ((context?: MobileOAuthContext) => void) | undefined;
  const unsubscribe = vi.fn();
  const service: AuthService = {
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((nextListener) => {
      listener = nextListener;
      return unsubscribe;
    }),
    subscribeSignInFailures: vi.fn((nextListener) => {
      signInFailureListener = nextListener;
      return vi.fn();
    }),
  };

  return {
    emit(session: AuthSession | null) {
      listener?.(session);
    },
    emitSignInFailure(context?: MobileOAuthContext) {
      signInFailureListener?.(context);
    },
    service,
    unsubscribe,
  };
}

function AuthProbe() {
  const {
    androidShareOAuthCallbackRevision,
    authErrorMessage,
    authState,
    signInWithGoogle,
    signOut,
  } = useAuth();

  return (
    <div>
      <p>{authState.status}</p>
      <p>공유 OAuth 복귀 {androidShareOAuthCallbackRevision}</p>
      {authErrorMessage ? <p>{authErrorMessage}</p> : null}
      {authState.status === 'signed-in' ? (
        <p>{authState.user.displayName}</p>
      ) : null}
      <button onClick={() => void signInWithGoogle()} type="button">
        로그인
      </button>
      <button onClick={() => void signOut()} type="button">
        로그아웃
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('waits for the initial session, then follows sign-in and sign-out events', () => {
    const auth = createServiceMock();
    render(
      <AuthProvider service={auth.service}>
        <AuthProbe />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).not.toBeNull();

    act(() => auth.emit(null));
    expect(screen.getByText('signed-out')).not.toBeNull();

    act(() =>
      auth.emit({
        user: {
          email: 'member@example.com',
          id: 'user-1',
          user_metadata: { full_name: '테스트 사용자' },
        },
      })
    );
    expect(screen.getByText('signed-in')).not.toBeNull();
    expect(screen.getByText('테스트 사용자')).not.toBeNull();

    act(() => auth.emit(null));
    expect(screen.getByText('signed-out')).not.toBeNull();
  });

  it('uses the current origin for Google login and delegates sign-out', async () => {
    const user = userEvent.setup();
    const auth = createServiceMock();
    const view = render(
      <AuthProvider service={auth.service}>
        <AuthProbe />
      </AuthProvider>
    );

    await user.click(screen.getByRole('button', { name: '로그인' }));
    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(auth.service.signInWithGoogle).toHaveBeenCalledWith(
      window.location.origin
    );
    expect(auth.service.signOut).toHaveBeenCalledOnce();

    view.unmount();
    expect(auth.unsubscribe).toHaveBeenCalledOnce();
  });

  it.each([
    { label: 'missing', userMetadata: undefined },
    { label: 'null', userMetadata: null },
  ])(
    'falls back to the email when user metadata is $label',
    ({ userMetadata }) => {
      const auth = createServiceMock();
      render(
        <AuthProvider service={auth.service}>
          <AuthProbe />
        </AuthProvider>
      );

      act(() =>
        auth.emit({
          user: {
            email: 'member@example.com',
            id: 'user-without-metadata',
            user_metadata: userMetadata,
          },
        })
      );

      expect(screen.getByText('member@example.com')).not.toBeNull();
    }
  );

  it('shows an OAuth callback error once and removes it from the URL', () => {
    window.history.replaceState(
      {},
      '',
      '/?error=access_denied&error_description=cancelled&keep=value#section'
    );
    const auth = createServiceMock();

    render(
      <AuthProvider service={auth.service}>
        <AuthProbe />
      </AuthProvider>
    );

    expect(
      screen.getByText('Google 로그인을 취소했어요. 다시 시도해 주세요.')
    ).not.toBeNull();
    expect(window.location.search).toBe('?keep=value');
    expect(window.location.hash).toBe('#section');
  });

  it('surfaces a mobile OAuth callback failure as a retryable sign-in error', () => {
    const auth = createServiceMock();
    render(
      <AuthProvider service={auth.service}>
        <AuthProbe />
      </AuthProvider>
    );

    act(() => auth.emitSignInFailure('android-share'));

    expect(screen.getByText('다시 시도해 주세요.')).not.toBeNull();
    expect(screen.getByText('공유 OAuth 복귀 1')).not.toBeNull();
  });
});
