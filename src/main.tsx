import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@wanteddev/wds';
import App from '@/app';
import { applyDesignTokens } from '@/shared/config/design-system';
import '@wanteddev/wds/global.css';

applyDesignTokens();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
