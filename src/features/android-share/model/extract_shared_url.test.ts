import { describe, expect, it } from 'vitest';

import { extractSharedUrl } from './extract_shared_url';

describe('공유 URL 추출', () => {
  it('텍스트 전체가 HTTP URL이면 그대로 반환한다', () => {
    expect(extractSharedUrl('https://example.com/article?keep=1#summary')).toBe(
      'https://example.com/article?keep=1#summary'
    );
  });

  it('문장 안에서는 왼쪽부터 처음 나타난 HTTP URL을 반환한다', () => {
    expect(
      extractSharedUrl(
        '읽어볼 글 https://example.com/first?keep=1#section, 다음은 https://example.com/second'
      )
    ).toBe('https://example.com/first?keep=1#section');
  });

  it('URL이 없으면 undefined를 반환한다', () => {
    expect(extractSharedUrl('나중에 읽어볼 만한 글이에요.')).toBeUndefined();
  });

  it('ftp URL은 지원하지 않는다', () => {
    expect(extractSharedUrl('ftp://example.com/archive')).toBeUndefined();
  });
});
