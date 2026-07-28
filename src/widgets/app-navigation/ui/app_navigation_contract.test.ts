/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appNavigationStyles = readFileSync(
  new URL('./app_navigation.css', import.meta.url),
  'utf8'
);

describe('AppNavigation style contract', () => {
  it('provides screen colors without reaching into vendor DOM', () => {
    expect(appNavigationStyles).toContain(
      '--navigation-active-color: var(--color-retrieve-blue);'
    );
    expect(appNavigationStyles).toContain(
      '--navigation-active-color: var(--color-library-coral);'
    );
    expect(appNavigationStyles).toContain(
      '--navigation-active-color: var(--color-save-green);'
    );
    expect(appNavigationStyles).not.toContain('wds-component');
  });
});
