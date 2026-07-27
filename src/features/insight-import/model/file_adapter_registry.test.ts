/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import type { ImportSourceAdapter } from './import_adapter';
import {
  detectFileInput,
  extractFileCandidates,
} from './file_adapter_registry';
import { ImportFileError } from './read_import_file';

describe('file adapter registry', () => {
  it('가장 높은 유효 confidence를 고르고 동률이면 등록 순서를 유지한다', async () => {
    const bookmark = createAdapter('bookmark-html', 0.8);
    const structured = createAdapter('generic-json', 0.8);
    const invalid = createAdapter('generic-html', Number.NaN);

    await expect(
      detectFileInput(createFile(), [bookmark, structured, invalid])
    ).resolves.toMatchObject({
      detection: { adapterKey: 'bookmark-html' },
    });
  });

  it('필드 매핑 요청이 있으면 extract를 호출하지 않고 모두 반환한다', async () => {
    const adapter = createAdapter('generic-csv', 1, [
      {
        fields: ['url', 'title'],
        sourceKey: 'file',
        suggested: {
          memoField: null,
          sourceKey: 'file',
          titleField: 'title',
          urlField: 'url',
        },
      },
    ]);

    await expect(
      extractFileCandidates({ file: createFile(), kind: 'file' }, [adapter])
    ).resolves.toMatchObject({
      adapterKey: 'generic-csv',
      candidates: null,
      mappingRequests: [{ sourceKey: 'file' }],
    });
    expect(adapter.extract).not.toHaveBeenCalled();
  });

  it('전용 구조만 지원하지 않을 때 generic text fallback을 한 번 시도한다', async () => {
    const dedicated = createAdapter('generic-json', 1);
    dedicated.extract = vi
      .fn()
      .mockRejectedValue(new ImportFileError('unsupported-structure'));
    const generic = createAdapter('generic-text', 0.1);

    await expect(
      extractFileCandidates({ file: createFile(), kind: 'file' }, [
        dedicated,
        generic,
      ])
    ).resolves.toMatchObject({
      adapterKey: 'generic-text',
      candidates: [],
      mappingRequests: null,
    });
    expect(generic.extract).toHaveBeenCalledTimes(1);
  });

  it.each(['corrupted-file', 'limit-exceeded'] as const)(
    '%s 오류는 fallback하지 않는다',
    async (code) => {
      const dedicated = createAdapter('generic-json', 1);
      dedicated.extract = vi.fn().mockRejectedValue(new ImportFileError(code));
      const generic = createAdapter('generic-text', 0.1);

      await expect(
        extractFileCandidates({ file: createFile(), kind: 'file' }, [
          dedicated,
          generic,
        ])
      ).rejects.toMatchObject({ code });
      expect(generic.extract).not.toHaveBeenCalled();
    }
  );
});

function createAdapter(
  adapterKey:
    | 'bookmark-html'
    | 'generic-csv'
    | 'generic-html'
    | 'generic-json'
    | 'generic-text',
  confidence: number,
  mappingRequests: Awaited<
    ReturnType<ImportSourceAdapter['detect']>
  > extends infer Detection
    ? Detection extends { mappingRequests: infer Requests }
      ? Exclude<Requests, null>
      : never
    : never = []
): ImportSourceAdapter {
  return {
    detect: vi.fn().mockResolvedValue({
      adapterKey,
      confidence,
      mappingRequests: mappingRequests.length > 0 ? mappingRequests : null,
    }),
    extract: vi.fn().mockResolvedValue([]),
  };
}

function createFile() {
  return new File(['https://example.com'], 'links.txt', {
    type: 'text/plain',
  });
}
