/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import linksMarkdown from '../testing/fixtures/links.md?raw';
import linksText from '../testing/fixtures/links.txt?raw';
import maliciousLinks from '../testing/fixtures/malicious_links.html?raw';
import {
  genericHtmlAdapter,
  genericMarkdownAdapter,
  genericTextAdapter,
} from './text_file_adapter';

describe('text file adapters', () => {
  it('Markdown 링크 제목과 URL을 추출하고 같은 문자 위치는 중복하지 않는다', async () => {
    const candidates = await genericMarkdownAdapter.extract({
      file: createFile(linksMarkdown, 'links.md', 'text/markdown'),
      kind: 'file',
    });

    expect(
      candidates.map(({ originalUrl, sourceLocation, titleCandidate }) => ({
        originalUrl,
        sourceLocation,
        titleCandidate,
      }))
    ).toEqual([
      {
        originalUrl: 'https://example.com/docs',
        sourceLocation: 'Markdown 3번째 줄',
        titleCandidate: '문서 제목',
      },
      {
        originalUrl: 'https://example.org/angle',
        sourceLocation: 'Markdown 4번째 줄',
        titleCandidate: null,
      },
      {
        originalUrl: 'https://example.net/plain',
        sourceLocation: 'Markdown 5번째 줄',
        titleCandidate: null,
      },
      {
        originalUrl: 'https://example.com/docs',
        sourceLocation: 'Markdown 5번째 줄',
        titleCandidate: '문서',
      },
    ]);
  });

  it('일반 텍스트 한 줄의 여러 URL과 줄 번호를 보존한다', async () => {
    const candidates = await genericTextAdapter.extract({
      file: createFile(linksText, 'links.txt', 'text/plain'),
      kind: 'file',
    });

    expect(
      candidates.map(({ originalUrl, sourceLocation }) => ({
        originalUrl,
        sourceLocation,
      }))
    ).toEqual([
      {
        originalUrl: 'https://example.com/one',
        sourceLocation: '1번째 줄',
      },
      {
        originalUrl: 'https://example.org/two',
        sourceLocation: '1번째 줄',
      },
      {
        originalUrl: 'https://example.net/three',
        sourceLocation: '2번째 줄',
      },
    ]);
  });

  it('HTML은 href와 안전한 text URL만 읽고 다른 속성과 코드는 실행하지 않는다', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('호출되면 안 됨'));

    const candidates = await genericHtmlAdapter.extract({
      file: createFile(maliciousLinks, 'links.html', 'text/html'),
      kind: 'file',
    });

    expect(candidates.map(({ originalUrl }) => originalUrl)).toEqual([
      'https://example.com/safe',
      'https://example.org/plain',
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      (globalThis as typeof globalThis & { __importExecuted?: boolean })
        .__importExecuted
    ).toBeUndefined();
  });

  it('닫는 태그 없이 끝난 HTML 링크도 후보로 보존한다', async () => {
    const candidates = await genericHtmlAdapter.extract({
      file: createFile(
        '<a href="https://example.com/pending">마지막 링크',
        'truncated.html',
        'text/html'
      ),
      kind: 'file',
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        originalUrl: 'https://example.com/pending',
        titleCandidate: '마지막 링크',
      }),
    ]);
  });
});

function createFile(text: string, name: string, type: string) {
  return new File([text], name, { type });
}
