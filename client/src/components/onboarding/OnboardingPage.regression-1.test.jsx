import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { OnboardingPage } from './OnboardingPage';

vi.mock('@/lib/api', () => ({
  loginWithGoogle: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.google;
});

test('initializes Google Identity once under React Strict Mode', () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com');
  const initialize = vi.fn();
  const renderButton = vi.fn();
  window.google = { accounts: { id: { initialize, renderButton } } };

  render(
    <StrictMode>
      <OnboardingPage onComplete={vi.fn()} />
    </StrictMode>,
  );

  expect(initialize).toHaveBeenCalledOnce();
  expect(renderButton).toHaveBeenCalledOnce();
});
