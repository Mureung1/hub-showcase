import { describe, expect, it } from 'vitest';

import {
  createGeminiDocumentProjection,
  createGeminiQueryProjection,
  GEMINI_PROJECTION_HASH,
} from '../gemini_projection';
import { EXPLORATORY_CORPUS } from '../fixtures/exploratory_corpus';
import { EXPLORATORY_QUERIES } from '../fixtures/exploratory_queries';

describe('Gemini 합성 데이터 projection', () => {
  it('승인받은 필드만 검색용 비대칭 prompt로 만든다', () => {
    const document = createGeminiDocumentProjection({
      id: '전송하면-안-되는-id',
      title: 'React 폼 검증 패턴',
      memo: '입력 오류를 즉시 안내할 때',
      category: '개발',
      domain: 'react.example',
      originalUrl: 'https://전송하면-안-되는-url.example/path',
      createdAt: '2099-01-01T00:00:00.000Z',
    });
    const query = createGeminiQueryProjection({
      id: '전송하면-안-되는-query-id',
      text: '표현이 다른 검색어',
      slice: 'semantic',
      phase: 'check',
      relevanceByInsightId: {
        '전송하면-안-되는-정답': 2,
      },
    });

    expect(document).toBe(
      'title: React 폼 검증 패턴 | text: 메모: 입력 오류를 즉시 안내할 때 | 도메인: react.example'
    );
    expect(query).toBe('task: search result | query: 표현이 다른 검색어');
    expect(document).not.toContain('개발');
    expect(document).not.toContain('전송하면-안-되는');
    expect(query).not.toContain('전송하면-안-되는');
  });

  it('승인 문서의 projection hash와 전송량을 고정한다', () => {
    const projectedInputs = [
      ...EXPLORATORY_CORPUS.map(createGeminiDocumentProjection),
      ...EXPLORATORY_QUERIES.map(createGeminiQueryProjection),
    ];
    const codePoints = projectedInputs.reduce(
      (sum, input) => sum + [...input].length,
      0
    );
    const utf8Bytes = projectedInputs.reduce(
      (sum, input) => sum + Buffer.byteLength(input, 'utf8'),
      0
    );

    expect(GEMINI_PROJECTION_HASH).toBe(
      '94d47b1d960143072daf2225190c741dbf91f759bb5a15c0cd079b9f004af684'
    );
    expect(projectedInputs).toHaveLength(117);
    expect(codePoints).toBe(7694);
    expect(utf8Bytes).toBe(13234);
  });
});
