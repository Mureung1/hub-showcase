import { describe, expect, it } from 'vitest';

import { pastedTextAdapter } from './pasted_text_adapter';

describe('붙여넣기 텍스트 어댑터', () => {
  it('붙여넣기 텍스트 입력만 감지한다', async () => {
    await expect(
      pastedTextAdapter.detect({
        kind: 'pasted-text',
        text: 'https://example.com',
      })
    ).resolves.toEqual({
      adapterKey: 'pasted-text',
      confidence: 1,
      mappingRequests: null,
    });
    await expect(
      pastedTextAdapter.detect({
        file: new File([], 'links.txt'),
        kind: 'file',
      })
    ).resolves.toBeNull();
  });

  it('문장 안의 URL을 왼쪽부터 추출하고 끝 문장부호와 짝 없는 닫는 괄호만 제거한다', async () => {
    const text = [
      '첫째 (https://example.com/a). 이어서 https://example.com/wiki/Function_(math)!',
      '둘째 https://example.org/b], 셋째 https://example.net/c}.',
    ].join('\n');

    await expect(
      pastedTextAdapter.extract({ kind: 'pasted-text', text })
    ).resolves.toEqual([
      {
        candidateId: `pasted-text:${text.indexOf('https://example.com/a')}`,
        capturedAtCandidate: null,
        collectionPath: [],
        explicitMemoCandidate: null,
        originalUrl: 'https://example.com/a',
        sourceLocation: '1번째 줄',
        titleCandidate: null,
        warnings: ['missing-title'],
      },
      {
        candidateId: `pasted-text:${text.indexOf(
          'https://example.com/wiki/Function_(math)'
        )}`,
        capturedAtCandidate: null,
        collectionPath: [],
        explicitMemoCandidate: null,
        originalUrl: 'https://example.com/wiki/Function_(math)',
        sourceLocation: '1번째 줄',
        titleCandidate: null,
        warnings: ['missing-title'],
      },
      {
        candidateId: `pasted-text:${text.indexOf('https://example.org/b')}`,
        capturedAtCandidate: null,
        collectionPath: [],
        explicitMemoCandidate: null,
        originalUrl: 'https://example.org/b',
        sourceLocation: '2번째 줄',
        titleCandidate: null,
        warnings: ['missing-title'],
      },
      {
        candidateId: `pasted-text:${text.indexOf('https://example.net/c')}`,
        capturedAtCandidate: null,
        collectionPath: [],
        explicitMemoCandidate: null,
        originalUrl: 'https://example.net/c',
        sourceLocation: '2번째 줄',
        titleCandidate: null,
        warnings: ['missing-title'],
      },
    ]);
  });

  it('같은 URL 후보를 제거하지 않고 입력 순서대로 유지한다', async () => {
    const text = [
      'https://example.com/a?utm_source=x#top',
      '다시 https://example.com/a',
    ].join('\n');

    const candidates = await pastedTextAdapter.extract({
      kind: 'pasted-text',
      text,
    });

    expect(candidates.map(({ originalUrl }) => originalUrl)).toEqual([
      'https://example.com/a?utm_source=x#top',
      'https://example.com/a',
    ]);
    expect(candidates.map(({ sourceLocation }) => sourceLocation)).toEqual([
      '1번째 줄',
      '2번째 줄',
    ]);
  });

  it('URL이 없거나 다른 입력이면 후보를 만들지 않는다', async () => {
    await expect(
      pastedTextAdapter.extract({ kind: 'pasted-text', text: '링크 없음' })
    ).resolves.toEqual([]);
    await expect(
      pastedTextAdapter.extract({
        connectionId: 'connection-id',
        kind: 'connected-account',
      })
    ).resolves.toEqual([]);
  });
});
