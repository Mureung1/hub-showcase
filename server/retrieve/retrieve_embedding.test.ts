import { describe, expect, it } from 'vitest';

import {
  createDocumentEmbeddingText,
  createQueryEmbeddingText,
  isEmbeddingVector,
  RETRIEVE_EMBEDDING_DIMENSIONS,
} from './retrieve_embedding';

describe('꺼내보기 임베딩 입력', () => {
  it('제목과 메모만 문서 입력에 넣는다', () => {
    expect(
      createDocumentEmbeddingText({
        category: '임의 분류',
        memo: '로그인 오류 문구를 사용자가 이해할 수 있게 쓴다',
        title: '오류 안내 작성법',
      })
    ).toBe(
      'title: 오류 안내 작성법 | text: 로그인 오류 문구를 사용자가 이해할 수 있게 쓴다'
    );
  });

  it('메모가 없으면 제목을 본문으로도 사용한다', () => {
    expect(
      createDocumentEmbeddingText({
        category: '개발',
        memo: null,
        title: '오류 안내 작성법',
      })
    ).toBe('title: 오류 안내 작성법 | text: 오류 안내 작성법');
  });

  it('검색 입력에 Gemini 권장 접두사를 붙인다', () => {
    expect(createQueryEmbeddingText(' 로그인 오류를 어떻게 보여주지? ')).toBe(
      'task: search result | query: 로그인 오류를 어떻게 보여주지?'
    );
  });

  it('768차원의 유한한 숫자 배열만 검색 벡터로 인정한다', () => {
    expect(
      isEmbeddingVector(Array(RETRIEVE_EMBEDDING_DIMENSIONS).fill(0.01))
    ).toBe(true);
    expect(
      isEmbeddingVector(
        Array(RETRIEVE_EMBEDDING_DIMENSIONS - 1).fill(0.01)
      )
    ).toBe(false);
    expect(
      isEmbeddingVector([
        ...Array(RETRIEVE_EMBEDDING_DIMENSIONS - 1).fill(0.01),
        Number.NaN,
      ])
    ).toBe(false);
  });
});
