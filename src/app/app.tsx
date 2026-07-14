import { useState } from 'react';

import {
  AccountMenu,
  AuthProvider,
  useAuth,
  type AuthService,
} from '@/features/auth';
import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';
import { LoadingState } from '@/shared/ui';

import { AuthenticatedWorkspace } from './authenticated_workspace';
import './styles/global.css';

type AuthEntryView = 'login' | 'onboarding';

export type AppProps = {
  authService?: AuthService;
};

function AppContent() {
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

export function App({ authService }: AppProps = {}) {
  return (
    <AuthProvider service={authService}>
      <AppContent />
    </AuthProvider>
  );
}
