import { useState } from 'react';

import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';

import { AuthenticatedWorkspace } from './authenticated_workspace';
import './styles/global.css';

type AuthEntryView = 'login' | 'onboarding' | 'workspace';

export function App() {
  const [authEntryView, setAuthEntryView] =
    useState<AuthEntryView>('onboarding');

  if (authEntryView === 'onboarding') {
    return <LandingPage onStart={() => setAuthEntryView('login')} />;
  }

  if (authEntryView === 'login') {
    return (
      <LoginPage
        onBack={() => setAuthEntryView('onboarding')}
        onLogin={() => setAuthEntryView('workspace')}
      />
    );
  }

  return <AuthenticatedWorkspace />;
}
