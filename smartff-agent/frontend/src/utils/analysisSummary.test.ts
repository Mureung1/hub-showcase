import { describe, it, expect } from 'vitest';
import { monthlyTrendSummary, weekdaySummary, timeSummary, trendSummary, seriesToSvg } from './analysisSummary';

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

describe('weekdaySummary', () => {
  it('최고값이 나머지 요일 평균보다 높으면 "높습니다"로 표시한다', () => {
    // others=[10,20,30,40,50,60] 평균 35, best=70 -> diff=round((70-35)/35*100)=100
    expect(weekdaySummary([10, 20, 30, 40, 50, 60, 70], '일', 6)).toBe(
      '일이 나머지 요일 평균보다 100% 높습니다.'
    );
  });

  it('지정된 인덱스 값이 나머지 평균보다 낮으면 "낮습니다"로 표시한다', () => {
    // others=[10,10,10,10,10,10] 평균 10, best=5 -> diff=round((5-10)/10*100)=-50 -> abs 50, 낮습니다
    expect(weekdaySummary([5, 10, 10, 10, 10, 10, 10], '월', 0)).toBe(
      '월이 나머지 요일 평균보다 50% 낮습니다.'
    );
  });

  it('나머지 요일이 전부 0이면 0으로 나누어 Infinity%가 나온다 (알려진 엣지케이스)', () => {
    expect(weekdaySummary([5, 0, 0], '월', 0)).toBe('월이 나머지 요일 평균보다 Infinity% 높습니다.');
  });
});

describe('timeSummary', () => {
  it('피크 구간의 판매 비중을 정상적으로 계산한다', () => {
    // total=100, peak(1,2)=20+30=50 -> share=50%
    expect(timeSummary([10, 20, 30, 40], ['0시', '1시', '2시', '3시'], [1, 2])).toBe(
      '1시-2시 구간에서 판매량의 50% 발생합니다.'
    );
  });

  it('피크 구간이 1개 인덱스뿐이면 시작·끝 라벨이 동일하게 표시된다', () => {
    expect(timeSummary([10, 20, 30, 40], ['0시', '1시', '2시', '3시'], [2])).toBe(
      '2시-2시 구간에서 판매량의 30% 발생합니다.'
    );
  });

  it('전체 합이 0이면 0으로 나누어 NaN%가 나온다 (알려진 엣지케이스)', () => {
    expect(timeSummary([0, 0, 0], ['0시', '1시', '2시'], [0])).toBe(
      '0시-0시 구간에서 판매량의 NaN% 발생합니다.'
    );
  });
});

describe('trendSummary', () => {
  describe('isWaste=true', () => {
    it('최근 4주 평균이 이전 4주보다 8% 초과 증가하면 상승 추세 문구를 반환한다', () => {
      const weekly = [10, 10, 10, 10, 20, 20, 20, 20]; // prev4 평균 10, last4 평균 20
      expect(trendSummary(weekly, true)).toBe('최근 1개월 폐기율 상승 추세, 최고 20.0%까지 확인됩니다.');
    });

    it('증가폭이 8% 이내면 안정 유지 문구를 반환한다', () => {
      const weekly = [10, 10, 10, 10, 10, 10, 10, 11];
      expect(trendSummary(weekly, true)).toBe('최근 1개월 11.0% 이하 범위 내 안정 유지 중입니다.');
    });
  });

  describe('isWaste=false', () => {
    it('3% 초과 상승하면 지속 상승세 문구를 반환한다', () => {
      const weekly = [100, 100, 100, 100, 140, 140, 140, 140];
      expect(trendSummary(weekly, false)).toBe('최근 1개월 지속 상승세입니다.');
    });

    it('3% 초과 하락하면 지속 하락세 문구를 반환한다', () => {
      const weekly = [140, 140, 140, 140, 100, 100, 100, 100];
      expect(trendSummary(weekly, false)).toBe('최근 1개월 지속 하락세입니다.');
    });

    it('증감이 3% 이내면 보합세 문구를 반환한다', () => {
      const weekly = [100, 100, 100, 100, 101, 101, 101, 101];
      expect(trendSummary(weekly, false)).toBe('최근 1개월 보합세를 유지하고 있습니다.');
    });
  });

  it('8주치가 안 되면 이전 구간이 빈 배열이 되어 NaN 비교로 조용히 보합세로 폴백된다 (알려진 엣지케이스)', () => {
    // weekly.length=2 -> slice(-8,-4)는 빈 배열, avgPrev=NaN, 모든 비교가 false
    expect(trendSummary([100, 130], false)).toBe('최근 1개월 보합세를 유지하고 있습니다.');
  });
});

describe('seriesToSvg', () => {
  it('오름차순 값에 대해 좌표를 정확히 계산한다', () => {
    const result = seriesToSvg([0, 50, 100], 300, 200, 20);
    // min=0, max=100, range=100, usableW=260, bottomY=176, usableH=156
    expect(result.points).toBe('20,176 150,98 280,20');
    expect(result.polygon).toBe('20,176 150,98 280,20 280,176 20,176');
    expect(result.dots).toEqual([
      { cx: 20, cy: 176, r: 5 },
      { cx: 150, cy: 98, r: 5 },
      { cx: 280, cy: 20, r: 6 },
    ]);
  });

  it('값이 전부 음수여도 0을 기준선으로 강제하지 않고 실제 최솟값을 사용한다', () => {
    // min(0, -10,-5,-20) = -20 (0보다 작은 실제 최솟값 사용), max=-5, range=15
    const result = seriesToSvg([-10, -5, -20], 300, 200, 20);
    const ys = result.dots.map((d) => d.cy);
    // -20이 가장 작은 값이므로 화면 최하단(bottomY=176)에 가장 가깝게 그려져야 함
    expect(ys[2]).toBe(176);
  });

  it('값이 1개뿐이면 분모가 0이 되어 좌표가 NaN이 된다 (알려진 엣지케이스)', () => {
    const result = seriesToSvg([50], 300, 200, 20);
    expect(result.points).toContain('NaN');
  });
});
