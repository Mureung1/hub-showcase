/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import chromeBookmarks from '../testing/fixtures/chrome_bookmarks.html?raw';
import linksCsv from '../testing/fixtures/links.csv?raw';
import linksMarkdown from '../testing/fixtures/links.md?raw';
import { createZipFixture } from '../testing/fixtures/create_zip_fixtures';
import { isUnsafeZipPath, zipFileAdapter } from './zip_file_adapter';

describe('zipFileAdapter', () => {
  it('사전 검사를 통과한 지원 entry를 순서대로 추출한다', async () => {
    const file = await createZipFile([
      { content: chromeBookmarks, name: 'bookmarks.html' },
      { content: linksCsv, name: 'export/links.csv' },
      { content: linksMarkdown, name: 'notes/links.md' },
    ]);
    const input = { file, kind: 'file' as const };

    await expect(zipFileAdapter.detect(input)).resolves.toMatchObject({
      adapterKey: 'zip',
      mappingRequests: null,
    });
    const candidates = await zipFileAdapter.extract(input);

    expect(candidates.length).toBeGreaterThan(5);
    expect(candidates[0]).toMatchObject({
      collectionPath: ['개발', 'React / 학습'],
      sourceLocation: 'ZIP bookmarks.html · 북마크 1',
    });
    expect(
      candidates.some(({ sourceLocation }) =>
        sourceLocation.startsWith('ZIP export/links.csv · CSV')
      )
    ).toBe(true);
  });

  it.each([
    '../outside.txt',
    'folder/../../outside.txt',
    String.raw`C:\outside.txt`,
    '/absolute.txt',
    `nul\0name.txt`,
    String.raw`folder\..\outside.txt`,
  ])('안전하지 않은 경로 %s를 거부한다', (filename) => {
    expect(isUnsafeZipPath(filename)).toBe(true);
  });

  it('중첩 ZIP과 암호화 entry를 추출 전에 거부한다', async () => {
    const nested = await createZipFile([
      { content: 'nested', name: 'inner.zip' },
    ]);
    const encrypted = await createZipFile([
      {
        content: 'https://example.com',
        name: 'secret.txt',
        options: { password: 'secret' },
      },
    ]);

    await expect(
      zipFileAdapter.extract({ file: nested, kind: 'file' })
    ).rejects.toMatchObject({ code: 'unsafe-zip' });
    await expect(
      zipFileAdapter.extract({ file: encrypted, kind: 'file' })
    ).rejects.toMatchObject({ code: 'unsafe-zip' });
  });

  it('101개 entry를 중앙 디렉터리 검사에서 거부한다', async () => {
    const file = await createZipFile(
      Array.from({ length: 101 }, (_, index) => ({
        content: 'https://example.com',
        name: `${index}.txt`,
      }))
    );

    await expect(
      zipFileAdapter.extract({ file, kind: 'file' })
    ).rejects.toMatchObject({ code: 'limit-exceeded' });
  }, 15_000);
});

async function createZipFile(entries: Parameters<typeof createZipFixture>[0]) {
  const blob = await createZipFixture(entries);
  return new File([blob], 'export.zip', { type: 'application/zip' });
}
