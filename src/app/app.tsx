import { useEffect, useMemo, useState } from 'react';

import {
  AccountMenu,
  AuthProvider,
  useAuth,
  type AuthService,
} from '@/features/auth';
import { AndroidShareScreen, useAndroidShare } from '@/features/android-share';
import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';
import {
  createBrowserInsightCaptureService,
  createBrowserInsightMemoService,
  type InsightCaptureService,
  type InsightMemoService,
  type InsightRepository,
} from '@/entities/insight';
import {
  createAndroidSharePluginAdapter,
  type AndroidSharePluginAdapter,
} from '@/shared/capacitor';
import { LoadingState } from '@/shared/ui';

import { AuthenticatedWorkspace } from './authenticated_workspace';
import {
  readPwaSharedSaveDraft,
  removePwaSharedSaveFragment,
} from './model/pwa_shared_save_draft';
import './styles/global.css';

type AuthEntryView = 'login' | 'onboarding';

function createLazyShareCaptureService(): InsightCaptureService {
  let service: InsightCaptureService | undefined;

  return {
    capture(request) {
      service ??= createBrowserInsightCaptureService();
      return service.capture(request);
    },
  };
}

function createLazyShareMemoService(): InsightMemoService {
  let service: InsightMemoService | undefined;

  return {
    updateMemo(insightId, memo) {
      service ??= createBrowserInsightMemoService();
      return service.updateMemo(insightId, memo);
    },
  };
}

export type AppProps = {
  androidShareCaptureService?: InsightCaptureService;
  androidShareMemoService?: InsightMemoService;
  androidSharePlugin?: AndroidSharePluginAdapter;
  authService?: AuthService;
  createInsightRepository?: (userId: string) => InsightRepository;
};

function AppContent({
  androidShareCaptureService,
  androidShareMemoService,
  androidSharePlugin,
  createInsightRepository,
}: Pick<
  AppProps,
  | 'androidShareCaptureService'
  | 'androidShareMemoService'
  | 'androidSharePlugin'
  | 'createInsightRepository'
>) {
  const {
    androidShareOAuthCallbackRevision,
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
  const shareCaptureService = useMemo(
    () => androidShareCaptureService ?? createLazyShareCaptureService(),
    [androidShareCaptureService]
  );
  const shareMemoService = useMemo(
    () => androidShareMemoService ?? createLazyShareMemoService(),
    [androidShareMemoService]
  );
  const sharePlugin = useMemo(
    () => androidSharePlugin ?? createAndroidSharePluginAdapter(),
    [androidSharePlugin]
  );
  const androidShare = useAndroidShare({
    androidShareOAuthCallbackRevision,
    authStatus: authState.status,
    captureService: shareCaptureService,
    hasSignInError: authErrorAction === 'sign-in',
    memoService: shareMemoService,
    plugin: sharePlugin,
    signInWithGoogle,
  });

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

  if (androidShare.state.status !== 'idle') {
    return <AndroidShareScreen controller={androidShare} />;
  }

  if (authState.status === 'loading') {
    return (
      <main className="auth-gate">
        <LoadingState label="로그인 상태를 확인하고 있어요" />
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

export function App({
  androidShareCaptureService,
  androidShareMemoService,
  androidSharePlugin,
  authService,
  createInsightRepository,
}: AppProps = {}) {
  return (
    <AuthProvider service={authService}>
      <AppContent
        androidShareCaptureService={androidShareCaptureService}
        androidShareMemoService={androidShareMemoService}
        androidSharePlugin={androidSharePlugin}
        createInsightRepository={createInsightRepository}
      />
    </AuthProvider>
  );
}
