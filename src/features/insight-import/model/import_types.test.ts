import { describe, expect, it } from 'vitest';

import {
  createCollectionKey,
  isImportAdapterKey,
  isImportInputKind,
} from './import_types';

describe('인사이트 가져오기 공통 계약', () => {
  it.each(['pasted-text', 'file', 'connected-account'])(
    '지원하는 입력 종류 %s를 허용한다',
    (kind) => {
      expect(isImportInputKind(kind)).toBe(true);
    }
  );

  it('지원하지 않는 입력 종류와 어댑터 키를 거부한다', () => {
    expect(isImportInputKind('clipboard')).toBe(false);
    expect(isImportAdapterKey('instagram-scraper')).toBe(false);
  });

  it('컬렉션 경로를 JSON 배열 키로 직렬화한다', () => {
    expect(createCollectionKey(['개발 / 학습', 'React'])).toBe(
      '["개발 / 학습","React"]'
    );
  });
});
