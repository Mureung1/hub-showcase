import { describe, it, expect } from 'vitest';
import { computeSizeScore } from './scorer.js';

describe('computeSizeScore', () => {
  describe('정상 케이스', () => {
    it('5줄 → 0.2 (15줄 미만 구간)', () => {
      expect(computeSizeScore(5)).toBe(0.2);
    });

    it('100줄 → 1.0 (15~300줄 구간)', () => {
      expect(computeSizeScore(100)).toBe(1.0);
    });

    it('500줄 → 0.5 (300줄 초과 구간)', () => {
      expect(computeSizeScore(500)).toBe(0.5);
    });
  });

  describe('경계값', () => {
    it('14줄 → 0.2 (미만 구간의 마지막 값)', () => {
      expect(computeSizeScore(14)).toBe(0.2);
    });

    it('15줄 → 1.0 (여기부터 15~300 구간에 포함)', () => {
      expect(computeSizeScore(15)).toBe(1.0);
    });

    it('300줄 → 1.0 (<=300이라 아직 포함)', () => {
      expect(computeSizeScore(300)).toBe(1.0);
    });

    it('301줄 → 0.5 (초과 구간 시작)', () => {
      expect(computeSizeScore(301)).toBe(0.5);
    });
  });

  describe('빈 값', () => {
    it('0줄(빈 파일) → 0.2', () => {
      expect(computeSizeScore(0)).toBe(0.2);
    });

    it('undefined(인자 안 넘김) → 0.5', () => {
      expect(computeSizeScore(undefined)).toBe(0.5);
    });

    it('null → 0.2 (숫자 비교에서 0으로 취급됨)', () => {
      expect(computeSizeScore(null)).toBe(0.2);
    });
  });
});
