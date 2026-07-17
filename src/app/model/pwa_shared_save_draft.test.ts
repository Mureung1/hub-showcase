import { describe, expect, it } from 'vitest';

import {
  readPwaSharedSaveDraft,
  removePwaSharedSaveFragment,
} from './pwa_shared_save_draft';

describe('PWA 공유 저장 초안', () => {
  it('공유 URL과 제목을 android_share 저장 초안으로 해석한다', () => {
    expect(
      readPwaSharedSaveDraft(
        '#share-target?shared_url=https%3A%2F%2Fexample.com%2Farticle&shared_title=%20%EA%B8%B0%EC%82%AC%20'
      )
    ).toEqual({
      source: 'android_share',
      title: '기사',
      url: 'https://example.com/article',
    });
  });

  it('공유 URL, 텍스트, 제목 순서로 첫 HTTP URL을 사용한다', () => {
    expect(
      readPwaSharedSaveDraft(
        '#share-target?shared_url=https%3A%2F%2Furl.example.com&shared_text=https%3A%2F%2Ftext.example.com&shared_title=https%3A%2F%2Ftitle.example.com'
      )
    ).toMatchObject({ url: 'https://url.example.com' });
    expect(
      readPwaSharedSaveDraft(
        '#share-target?shared_text=%EC%B6%94%EC%B2%9C%20%EB%A7%81%ED%81%AC%20https%3A%2F%2Ftext.example.com&shared_title=https%3A%2F%2Ftitle.example.com'
      )
    ).toMatchObject({ url: 'https://text.example.com' });
    expect(
      readPwaSharedSaveDraft(
        '#share-target?shared_title=https%3A%2F%2Ftitle.example.com'
      )
    ).toEqual({
      source: 'android_share',
      url: 'https://title.example.com',
    });
  });

  it('HTTP와 HTTPS가 아닌 후보는 건너뛰고 유효한 다음 후보를 사용한다', () => {
    expect(
      readPwaSharedSaveDraft(
        '#share-target?shared_url=javascript%3Aalert%281%29&shared_text=ftp%3A%2F%2Fexample.com&shared_title=http%3A%2F%2Fexample.com'
      )
    ).toEqual({ source: 'android_share', url: 'http://example.com' });
    expect(
      readPwaSharedSaveDraft(
        '#share-target?shared_url=javascript%3Aalert%281%29'
      )
    ).toBeUndefined();
  });

  it('제목이 선택한 URL과 같으면 제목으로 보존하지 않는다', () => {
    expect(
      readPwaSharedSaveDraft(
        '#share-target?shared_url=https%3A%2F%2Fexample.com&shared_title=%20https%3A%2F%2Fexample.com%20'
      )
    ).toEqual({ source: 'android_share', url: 'https://example.com' });
  });

  it('share-target fragment가 아닌 hash는 저장 초안으로 해석하지 않는다', () => {
    expect(
      readPwaSharedSaveDraft('#top?shared_url=https%3A%2F%2Fexample.com')
    ).toBeUndefined();
  });

  it('share-target fragment만 제거하고 pathname과 search를 보존한다', () => {
    expect(
      removePwaSharedSaveFragment(
        '/library?tab=save#share-target?shared_url=https%3A%2F%2Fexample.com'
      )
    ).toBe('/library?tab=save');
    expect(
      removePwaSharedSaveFragment('/library?tab=save#top')
    ).toBeUndefined();
  });
});
