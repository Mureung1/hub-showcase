import '@wanteddev/wds/global.css';

import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '@wanteddev/wds';

export function DesignSystemProvider({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
