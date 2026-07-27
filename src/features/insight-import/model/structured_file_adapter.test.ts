/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import ambiguousCsv from '../testing/fixtures/ambiguous_links.csv?raw';
import linksCsv from '../testing/fixtures/links.csv?raw';
import linksJson from '../testing/fixtures/links.json?raw';
import {
  genericCsvAdapter,
  genericJsonAdapter,
} from './structured_file_adapter';

describe('structured file adapters', () => {
  it('CSV quoting과 줄바꿈을 보존하고 명확한 필드를 자동 선택한다', async () => {
    const input = {
      file: createFile(linksCsv, 'links.csv', 'text/csv'),
      kind: 'file' as const,
    };

    await expect(genericCsvAdapter.detect(input)).resolves.toMatchObject({
      adapterKey: 'generic-csv',
      mappingRequests: null,
    });
    const candidates = await genericCsvAdapter.extract(input);

    expect(candidates).toEqual([
      expect.objectContaining({
        explicitMemoCandidate: '첫 줄\n둘째 줄',
        originalUrl: 'https://example.com/a?query=one,two',
        sourceLocation: 'CSV 2번째 행',
        titleCandidate: '쉼표, 제목',
      }),
      expect.objectContaining({
        explicitMemoCandidate: null,
        originalUrl: 'https://example.org/b',
        sourceLocation: 'CSV 3번째 행',
        titleCandidate: '두 번째',
      }),
    ]);
  });

  it('JSON wrapper와 중첩 scalar leaf를 JSON Pointer 필드로 평탄화한다', async () => {
    const input = {
      file: createFile(linksJson, 'links.json', 'application/json'),
      kind: 'file' as const,
    };

    await expect(genericJsonAdapter.extract(input)).resolves.toEqual([
      expect.objectContaining({
        explicitMemoCandidate: 'JSON 메모',
        originalUrl: 'https://example.com/nested',
        sourceLocation: 'JSON items[0]',
        titleCandidate: '중첩 제목',
      }),
      expect.objectContaining({
        originalUrl: 'https://example.org/second',
        sourceLocation: 'JSON items[1]',
      }),
    ]);
  });

  it('top-level 배열을 허용하고 배열 property가 둘이면 구조를 추측하지 않는다', async () => {
    const arrayInput = {
      file: createFile(
        JSON.stringify([{ url: 'https://example.com/array', title: '배열' }]),
        'array.json',
        'application/json'
      ),
      kind: 'file' as const,
    };
    const ambiguousInput = {
      file: createFile(
        JSON.stringify({
          archived: [{ url: 'https://example.com/a' }],
          items: [{ url: 'https://example.com/b' }],
        }),
        'ambiguous.json',
        'application/json'
      ),
      kind: 'file' as const,
    };

    await expect(genericJsonAdapter.extract(arrayInput)).resolves.toEqual([
      expect.objectContaining({
        originalUrl: 'https://example.com/array',
        sourceLocation: 'JSON [0]',
      }),
    ]);
    await expect(
      genericJsonAdapter.extract(ambiguousInput)
    ).rejects.toMatchObject({ code: 'unsupported-structure' });
  });

  it('URL 값 필드가 둘이면 모든 필드와 제안 매핑을 한 번 요청한다', async () => {
    const input = {
      file: createFile(ambiguousCsv, 'ambiguous.csv', 'text/csv'),
      kind: 'file' as const,
    };

    await expect(genericCsvAdapter.detect(input)).resolves.toMatchObject({
      mappingRequests: [
        {
          fields: ['primary_url', 'backup_link', 'title', 'note'],
          sourceKey: 'file',
          suggested: {
            memoField: 'note',
            sourceKey: 'file',
            titleField: 'title',
          },
        },
      ],
    });
  });

  it('사용자가 명시한 URL·제목·메모 필드만 후보로 변환한다', async () => {
    const candidates = await genericCsvAdapter.extract({
      file: createFile(ambiguousCsv, 'ambiguous.csv', 'text/csv'),
      kind: 'file',
      mappings: [
        {
          memoField: 'note',
          sourceKey: 'file',
          titleField: null,
          urlField: 'backup_link',
        },
      ],
    });

    expect(candidates[0]).toMatchObject({
      explicitMemoCandidate: '명시적 메모',
      originalUrl: 'https://backup.example.com/a',
      titleCandidate: null,
    });
  });
});

function createFile(text: string, name: string, type: string) {
  return new File([text], name, { type });
}
