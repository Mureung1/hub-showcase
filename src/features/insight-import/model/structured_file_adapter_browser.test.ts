/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('structured file adapter 브라우저 호환성', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('Node Buffer가 없는 브라우저에서도 CSV를 분석한다', async () => {
    const file = new File(
      [
        ['url,title', 'https://example.com/article,"첫 줄\r\n둘째 줄"'].join(
          '\r\n'
        ),
      ],
      'links.csv',
      { type: 'text/csv' }
    );
    vi.stubGlobal('Buffer', undefined);

    const { genericCsvAdapter } = await import('./structured_file_adapter');

    await expect(
      genericCsvAdapter.extract({ file, kind: 'file' })
    ).resolves.toEqual([
      expect.objectContaining({
        originalUrl: 'https://example.com/article',
        titleCandidate: '첫 줄\n둘째 줄',
      }),
    ]);
  });
});
