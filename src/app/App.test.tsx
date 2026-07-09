import { describe, expect, it } from 'vitest';

import { App } from './index';

describe('App public API', () => {
  it('exports the root app component from the app layer', () => {
    expect(App).toBeTypeOf('function');
  });
});
