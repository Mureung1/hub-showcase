import { describe, it, expect } from 'vitest';
import { isMeaningfulQuery } from './isMeaningfulQuery.js';

describe('isMeaningfulQuery', () => {
  describe('정상 케이스', () => {
    it('영문자가 포함되면 true를 반환한다', () => {
      expect(isMeaningfulQuery('ls')).toBe(true);
    });

    it('한글이 포함되면 true를 반환한다', () => {
      expect(isMeaningfulQuery('검색')).toBe(true);
    });
  });

  describe('빈 값 / 경계값 케이스', () => {
    it('빈 문자열이면 false를 반환한다', () => {
      expect(isMeaningfulQuery('')).toBe(false);
    });

    it('숫자만 있으면 false를 반환한다 (문자 없음)', () => {
      expect(isMeaningfulQuery('123')).toBe(false);
    });
  });

  describe('실패 / 오용 케이스', () => {
    it('기호만 있으면 false를 반환한다', () => {
      expect(isMeaningfulQuery('!!!')).toBe(false);
    });

    it('기호 사이에 문자가 하나라도 있으면 true를 반환한다', () => {
      expect(isMeaningfulQuery('a1!')).toBe(true);
    });
  });
});
