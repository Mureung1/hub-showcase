/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import { createZipFixture } from '../testing/fixtures/create_zip_fixtures';
import type { ImportSourceAdapter } from './import_adapter';
import { bookmarkHtmlAdapter } from './bookmark_html_adapter';
import type { ImportInput, ImportWarningCode } from './import_types';
import { pastedTextAdapter } from './pasted_text_adapter';
import {
  genericCsvAdapter,
  genericJsonAdapter,
} from './structured_file_adapter';
import {
  genericHtmlAdapter,
  genericMarkdownAdapter,
  genericTextAdapter,
} from './text_file_adapter';
import { zipFileAdapter } from './zip_file_adapter';

const ALLOWED_WARNINGS = new Set<ImportWarningCode>([
  'ambiguous-field',
  'missing-title',
  'trimmed-memo',
  'trimmed-title',
]);

describe('import adapter contract', () => {
  it('지원 어댑터가 결정적이고 외부 요청 없는 표준 후보를 반환한다', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('호출되면 안 됨'));
    const cases = await createCases();

    for (const { adapter, input } of cases) {
      const first = await adapter.extract(input);
      const second = await adapter.extract(input);

      expect(second).toEqual(first);
      expect(first.length).toBeGreaterThan(0);

      for (const candidate of first) {
        expect(candidate.originalUrl.length).toBeGreaterThan(0);
        expect(candidate.sourceLocation.length).toBeGreaterThan(0);
        expect(candidate.collectionPath.length).toBeLessThanOrEqual(20);
        expect(
          candidate.warnings.every((warning) => ALLOWED_WARNINGS.has(warning))
        ).toBe(true);
      }
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

async function createCases(): Promise<
  Array<{ adapter: ImportSourceAdapter; input: ImportInput }>
> {
  const zipBlob = await createZipFixture([
    { content: 'https://example.com/zip', name: 'links.txt' },
  ]);

  return [
    {
      adapter: pastedTextAdapter,
      input: { kind: 'pasted-text', text: 'https://example.com/paste' },
    },
    {
      adapter: bookmarkHtmlAdapter,
      input: {
        file: createFile(
          '<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><A HREF="https://example.com/bookmark">제목</A></DL>',
          'bookmarks.html',
          'text/html'
        ),
        kind: 'file',
      },
    },
    {
      adapter: genericHtmlAdapter,
      input: {
        file: createFile(
          '<a href="https://example.com/html">HTML</a>',
          'links.html',
          'text/html'
        ),
        kind: 'file',
      },
    },
    {
      adapter: genericMarkdownAdapter,
      input: {
        file: createFile(
          '[Markdown](https://example.com/markdown)',
          'links.md',
          'text/markdown'
        ),
        kind: 'file',
      },
    },
    {
      adapter: genericTextAdapter,
      input: {
        file: createFile('https://example.com/text', 'links.txt', 'text/plain'),
        kind: 'file',
      },
    },
    {
      adapter: genericCsvAdapter,
      input: {
        file: createFile(
          'url,title\nhttps://example.com/csv,CSV',
          'links.csv',
          'text/csv'
        ),
        kind: 'file',
      },
    },
    {
      adapter: genericJsonAdapter,
      input: {
        file: createFile(
          '[{"url":"https://example.com/json","title":"JSON"}]',
          'links.json',
          'application/json'
        ),
        kind: 'file',
      },
    },
    {
      adapter: zipFileAdapter,
      input: {
        file: new File([zipBlob], 'links.zip', {
          type: 'application/zip',
        }),
        kind: 'file',
      },
    },
  ];
}

function createFile(text: string, name: string, type: string) {
  return new File([text], name, { type });
}
