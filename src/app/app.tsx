import { useEffect, useMemo, useState } from 'react';

import {
  AccountMenu,
  AuthProvider,
  useAuth,
  type AuthService,
} from '@/features/auth';
import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';
import type { InsightRepository } from '@/entities/insight';
import { LoadingState } from '@/shared/ui';

import { AuthenticatedWorkspace } from './authenticated_workspace';
import {
  readPwaSharedSaveDraft,
  removePwaSharedSaveFragment,
} from './model/pwa_shared_save_draft';
import './styles/global.css';

type AuthEntryView = 'login' | 'onboarding';

export type AppProps = {
  authService?: AuthService;
  createInsightRepository?: (userId: string) => InsightRepository;
};

function AppContent({
  createInsightRepository,
}: Pick<AppProps, 'createInsightRepository'>) {
  const {
    authAction,
    authErrorAction,
    authErrorMessage,
    authState,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const [authEntryView, setAuthEntryView] = useState<AuthEntryView>(() =>
    authErrorAction === 'sign-in' ? 'login' : 'onboarding'
  );
  const signedInUserId =
    authState.status === 'signed-in' ? authState.user.id : undefined;
  const insightRepository = useMemo(
    () =>
      signedInUserId && createInsightRepository
        ? createInsightRepository(signedInUserId)
        : undefined,
    [createInsightRepository, signedInUserId]
  );
  const sharedSaveDraft = useMemo(
    () =>
      authState.status === 'signed-in'
        ? readPwaSharedSaveDraft(window.location.hash)
        : undefined,
    [authState.status]
  );

  useEffect(() => {
    if (authState.status === 'loading') {
      return;
    }

    const nextPath = removePwaSharedSaveFragment(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );

    if (nextPath) {
      window.history.replaceState({}, '', nextPath);
    }
  }, [authState.status]);

  if (authState.status === 'loading') {
    return (
      <main className="auth-gate">
        <LoadingState label="로그인 상태 확인 중" />
      </main>
    );
  }

  if (authState.status === 'signed-in') {
    return (
      <AuthenticatedWorkspace
        accountControl={
          <AccountMenu
            errorMessage={
              authErrorAction === 'sign-out' ? authErrorMessage : undefined
            }
            isSigningOut={authAction === 'sign-out'}
            onSignOut={() => void signOut()}
            user={authState.user}
          />
        }
        initialSaveDraft={sharedSaveDraft}
        repository={insightRepository}
        userId={authState.user.id}
      />
    );
  }

  if (authEntryView === 'onboarding') {
    return <LandingPage onStart={() => setAuthEntryView('login')} />;
  }

  if (authEntryView === 'login') {
    return (
      <LoginPage
        errorMessage={
          authErrorAction === 'sign-in' ? authErrorMessage : undefined
        }
        isLoading={authAction === 'sign-in'}
        onBack={() => setAuthEntryView('onboarding')}
        onLogin={() => void signInWithGoogle()}
      />
    );
  }

  return <LandingPage onStart={() => setAuthEntryView('login')} />;
}

export function App({ authService, createInsightRepository }: AppProps = {}) {
  return (
    <AuthProvider service={authService}>
      <AppContent createInsightRepository={createInsightRepository} />
    </AuthProvider>
  );
}
