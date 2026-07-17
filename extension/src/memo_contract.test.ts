import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const HTML_PATH = new URL('../memo.html', import.meta.url);
const CSS_PATH = new URL('./memo.css', import.meta.url);

describe('extension memo page contract', () => {
  it('provides a Korean labeled memo form with a 200 character limit', async () => {
    const html = await readFile(HTML_PATH, 'utf8');

    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('<label for="memo">한 줄 메모</label>');
    expect(html).toContain('maxlength="200"');
    expect(html).toContain('data-memo-form');
    expect(html).toContain('data-memo-status');
    expect(html).toMatch(/>\s*메모 저장\s*<\/button>/);
    expect(html).toMatch(/>\s*닫기\s*<\/button>/);
    expect(html).toContain('src="/src/memo.ts"');
  });

  it('uses design tokens, 44px controls, and visible keyboard focus', async () => {
    const css = await readFile(CSS_PATH, 'utf8');

    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).toContain('var(--color-canvas)');
    expect(css).toContain('var(--color-ash)');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('2px solid var(--color-electric-blue)');
    expect(css).toContain('var(--color-error-ink)');
    expect(css).toContain('var(--color-signal-green)');
  });
});
