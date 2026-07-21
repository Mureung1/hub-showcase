import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getSupabaseClient } from '@/shared/api';
import { createDefaultMobileOAuth } from '@/shared/capacitor';

import {
  createSupabaseAuthService,
  type AuthService,
  type AuthSession,
} from '../api/auth_service';
import {
  getUrlWithoutAuthCallbackError,
  readAuthCallbackError,
} from './auth_callback_error';
import { AuthContext } from './auth_context';
import type { AuthAction, AuthState, AuthUser } from './auth_types';

export type AuthProviderProps = {
  children: ReactNode;
  service?: AuthService;
};

function readMetadataText(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  if (!metadata) {
    return undefined;
  }

  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toAuthUser(session: AuthSession): AuthUser {
  const { user } = session;
  const displayName =
    readMetadataText(user.user_metadata, 'full_name') ??
    readMetadataText(user.user_metadata, 'name') ??
    user.email ??
    '사용자';
  const avatarUrl = readMetadataText(user.user_metadata, 'avatar_url');

  return {
    ...(avatarUrl ? { avatarUrl } : {}),
    displayName,
    ...(user.email ? { email: user.email } : {}),
    id: user.id,
  };
}

function createDefaultService() {
  const client = getSupabaseClient();

  return createSupabaseAuthService(client, createDefaultMobileOAuth(client));
}

function getInitialAuthError() {
  return (
    readAuthCallbackError(window.location.search) ??
    readAuthCallbackError(window.location.hash)
  );
}

function getActionErrorMessage(action: AuthAction, error: unknown) {
  const actionLabel = action === 'sign-in' ? 'Google 로그인' : '로그아웃';
  const reason =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : '알 수 없는 인증 오류가 발생했습니다.';

  return `${actionLabel}에 실패했습니다. ${reason}`;
}

export function AuthProvider({ children, service }: AuthProviderProps) {
  const authService = useMemo(
    () => service ?? createDefaultService(),
    [service]
  );
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [authAction, setAuthAction] = useState<AuthAction>();
  const [initialAuthError] = useState(getInitialAuthError);
  const [authErrorAction, setAuthErrorAction] = useState<
    AuthAction | undefined
  >(initialAuthError ? 'sign-in' : undefined);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | undefined>(
    initialAuthError
  );
  const [
    androidShareOAuthCallbackRevision,
    setAndroidShareOAuthCallbackRevision,
  ] = useState(0);

  useEffect(() => {
    if (!initialAuthError) {
      return;
    }

    const cleanUrl = getUrlWithoutAuthCallbackError(window.location.href);

    if (cleanUrl) {
      window.history.replaceState(window.history.state, '', cleanUrl);
    }
  }, [initialAuthError]);

  useEffect(
    () =>
      authService.subscribe((session) => {
        if (session) {
          setAuthErrorAction(undefined);
          setAuthErrorMessage(undefined);
        }
        setAuthState(
          session
            ? { status: 'signed-in', user: toAuthUser(session) }
            : { status: 'signed-out' }
        );
      }),
    [authService]
  );

  useEffect(
    () =>
      authService.subscribeSignInFailures?.((context) => {
        setAuthAction(undefined);
        setAuthErrorAction('sign-in');
        setAuthErrorMessage(
          getActionErrorMessage(
            'sign-in',
            new Error('로그인을 완료하지 못했어요.')
          )
        );
        if (context === 'android-share') {
          setAndroidShareOAuthCallbackRevision((revision) => revision + 1);
        }
      }),
    [authService]
  );

  useEffect(
    () =>
      authService.subscribeMobileOAuthCallbacks?.((context) => {
        if (context === 'android-share') {
          setAndroidShareOAuthCallbackRevision((revision) => revision + 1);
        }
      }),
    [authService]
  );

  const runAuthAction = useCallback(
    async (action: AuthAction, command: () => Promise<void>) => {
      setAuthAction(action);
      setAuthErrorAction(undefined);
      setAuthErrorMessage(undefined);

      try {
        await command();
      } catch (error) {
        setAuthErrorAction(action);
        setAuthErrorMessage(getActionErrorMessage(action, error));
      } finally {
        setAuthAction(undefined);
      }
    },
    []
  );
  const signInWithGoogle = useCallback(
    (context?: 'android-share') =>
      runAuthAction('sign-in', () =>
        context
          ? authService.signInWithGoogle(window.location.origin, context)
          : authService.signInWithGoogle(window.location.origin)
      ),
    [authService, runAuthAction]
  );
  const signOut = useCallback(
    () => runAuthAction('sign-out', () => authService.signOut()),
    [authService, runAuthAction]
  );
  const value = useMemo(
    () => ({
      androidShareOAuthCallbackRevision,
      ...(authAction ? { authAction } : {}),
      ...(authErrorAction ? { authErrorAction } : {}),
      ...(authErrorMessage ? { authErrorMessage } : {}),
      authState,
      signInWithGoogle,
      signOut,
    }),
    [
      androidShareOAuthCallbackRevision,
      authAction,
      authErrorAction,
      authErrorMessage,
      authState,
      signInWithGoogle,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
