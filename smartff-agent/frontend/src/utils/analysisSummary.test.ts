import { describe, it, expect } from 'vitest';
import { monthlyTrendSummary } from './analysisSummary';

describe('monthlyTrendSummary', () => {
  describe('가드 (빈 값 / 최소 길이)', () => {
    it('빈 배열이면 데이터 부족 문구를 반환한다', () => {
      expect(monthlyTrendSummary([], false)).toBe('데이터가 더 필요합니다.');
    });

    it('길이가 1인 배열도 데이터 부족 문구를 반환한다', () => {
      expect(monthlyTrendSummary([100], true)).toBe('데이터가 더 필요합니다.');
    });
  });

  describe('정상 케이스 — isWaste=false (매출 등)', () => {
    it('직전월 대비 3% 초과 상승하면 상승세 문구를 반환한다', () => {
      expect(monthlyTrendSummary([100, 130], false)).toBe('최근 1개월 지속 상승세입니다.');
    });

    it('직전월 대비 3% 초과 하락하면 하락세 문구를 반환한다', () => {
      expect(monthlyTrendSummary([130, 100], false)).toBe('최근 1개월 지속 하락세입니다.');
    });

    it('증감이 3% 이내면 보합세 문구를 반환한다', () => {
      expect(monthlyTrendSummary([100, 101], false)).toBe('최근 1개월 보합세를 유지하고 있습니다.');
    });
  });

  describe('정상 케이스 — isWaste=true (폐기율 등)', () => {
    it('직전월 대비 8% 초과 상승하면 상승 추세 + 최댓값 문구를 반환한다', () => {
      expect(monthlyTrendSummary([5, 10], true)).toBe(
        '최근 1개월 폐기율 상승 추세, 최고 10.0%까지 확인됩니다.'
      );
    });

    it('상승 추세가 아니면(하락 포함) 안정 유지 문구를 반환한다', () => {
      // 안정 유지 문구는 latest가 아니라 배열 전체 max를 사용 -> [10, 9]의 max는 10
      expect(monthlyTrendSummary([10, 9], true)).toBe('최근 1개월 10.0% 이하 범위 내 안정 유지 중입니다.');
    });
  });

  describe('경계값', () => {
    it('증감률이 정확히 3%면(diff > threshold가 거짓) 보합세로 처리된다', () => {
      // prev=100, latest=103 -> diff=3, threshold=100*0.03=3 -> 3 > 3 은 false
      expect(monthlyTrendSummary([100, 103], false)).toBe('최근 1개월 보합세를 유지하고 있습니다.');
    });

    it('prev가 0이면 임계값도 0이 되어 조금만 늘어도 상승 추세로 판정된다', () => {
      expect(monthlyTrendSummary([0, 5], true)).toBe(
        '최근 1개월 폐기율 상승 추세, 최고 5.0%까지 확인됩니다.'
      );
    });

    it('prev가 음수여도 Math.abs 덕분에 방향이 올바르게 판정된다', () => {
      // prev=-10, latest=-5 -> diff=5, threshold=Math.abs(-10)*0.03=0.3 -> 5 > 0.3 -> 상승세
      expect(monthlyTrendSummary([-10, -5], false)).toBe('최근 1개월 지속 상승세입니다.');
    });
  });

  describe('실패/이상 케이스', () => {
    it('NaN이 포함되면 모든 비교가 false가 되어 보합세로 조용히 폴백된다', () => {
      expect(monthlyTrendSummary([NaN, 100], false)).toBe('최근 1개월 보합세를 유지하고 있습니다.');
    });

    it('배열 길이가 3 이상이어도 마지막 두 값만 비교에 사용한다', () => {
      // 중간값 999999는 무시되고 마지막 두 값(999999 -> 101)만 비교됨 -> 급락으로 판정
      expect(monthlyTrendSummary([100, 999999, 101], false)).toBe('최근 1개월 지속 하락세입니다.');
    });
  });
});
