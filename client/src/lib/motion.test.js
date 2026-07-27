import { afterEach, expect, test, vi } from 'vitest';

import { prefersReducedMotion } from './motion';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('detects the reduced-motion preference', () => {
  const matchMedia = vi.fn().mockReturnValue({ matches: true });
  vi.stubGlobal('matchMedia', matchMedia);

  expect(prefersReducedMotion()).toBe(true);
  expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
});

test('defaults to motion when matchMedia is unavailable', () => {
  vi.stubGlobal('matchMedia', undefined);

  expect(prefersReducedMotion()).toBe(false);
});
