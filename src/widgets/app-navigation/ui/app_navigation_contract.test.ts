/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appNavigationStyles = readFileSync(
  new URL('./app_navigation.css', import.meta.url),
  'utf8'
);

describe('AppNavigation style contract', () => {
  it('keeps the fixed navigation within the planned 420px width', () => {
    expect(appNavigationStyles).toMatch(
      /div\.app-navigation\.navigation-bar\[wds-component='bottom-navigation'\][\s\S]*width:\s*min\(420px,\s*calc\(100%\s*-\s*var\(--spacing-8\)\)\)/
    );
  });
});
