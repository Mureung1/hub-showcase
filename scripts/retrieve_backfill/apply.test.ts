import { describe, expect, it } from 'vitest';

import { parseBatchResponse } from './apply';

describe('꺼내보기 기존 데이터 변환 결과', () => {
  it('벡터 형식이 잘못된 응답을 실패 건으로 분류한다', () => {
    expect(
      parseBatchResponse({
        response: {
          embedding: { values: [0.01] },
        },
      })
    ).toEqual({ kind: 'failed' });
  });
});
