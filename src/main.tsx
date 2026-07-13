import '@/app/styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app';
import { applyDesignTokens } from '@/shared/config/design-system';
import { DesignSystemProvider } from '@/shared/ui';

applyDesignTokens();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignSystemProvider>
      <App />
    </DesignSystemProvider>
  </StrictMode>
);
