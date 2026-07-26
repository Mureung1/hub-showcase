/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import chromeBookmarks from '../testing/fixtures/chrome_bookmarks.html?raw';
import firefoxBookmarks from '../testing/fixtures/firefox_bookmarks.html?raw';
import maliciousLinks from '../testing/fixtures/malicious_links.html?raw';
import { bookmarkHtmlAdapter } from './bookmark_html_adapter';

describe('bookmarkHtmlAdapter', () => {
  it('Netscape 북마크의 제목, 폴더 경로와 저장 시각을 추출한다', async () => {
    const input = {
      file: createFile(chromeBookmarks, 'chrome.html'),
      kind: 'file' as const,
    };

    await expect(bookmarkHtmlAdapter.detect(input)).resolves.toMatchObject({
      adapterKey: 'bookmark-html',
      confidence: 1,
    });
    const candidates = await bookmarkHtmlAdapter.extract(input);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      capturedAtCandidate: '2026-02-02T02:41:40.000Z',
      collectionPath: ['개발', 'React / 학습'],
      originalUrl: 'https://example.com/react?utm_source=chrome',
      sourceLocation: '북마크 1',
      titleCandidate: 'React 문서',
    });
    expect(candidates[1]?.originalUrl).toBe('javascript:alert(1)');
  });

  it('같은 표준을 쓰는 다른 브라우저 파일도 감지한다', async () => {
    const input = {
      file: createFile(firefoxBookmarks, 'bookmarks.html'),
      kind: 'file' as const,
    };

    await expect(bookmarkHtmlAdapter.extract(input)).resolves.toEqual([
      expect.objectContaining({
        collectionPath: ['읽을거리'],
        originalUrl: 'https://example.org/firefox',
        titleCandidate: 'Firefox 북마크',
      }),
    ]);
  });

  it('HTML을 DOM에 삽입하거나 리소스와 스크립트를 실행하지 않는다', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('호출되면 안 됨'));
    const input = {
      file: createFile(
        `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><p><DT><A HREF="https://example.com/safe">안전</A>${maliciousLinks}</DL>`,
        'malicious.html'
      ),
      kind: 'file' as const,
    };

    const candidates = await bookmarkHtmlAdapter.extract(input);

    expect(candidates.map(({ originalUrl }) => originalUrl)).toEqual([
      'https://example.com/safe',
      'https://example.com/safe',
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      (globalThis as typeof globalThis & { __importExecuted?: boolean })
        .__importExecuted
    ).toBeUndefined();
  });
});

function createFile(text: string, name: string) {
  return new File([text], name, { type: 'text/html' });
}
