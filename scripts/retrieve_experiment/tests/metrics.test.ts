import { describe, expect, it } from 'vitest';

import { calculateRankingMetrics, compareQueryScores } from '../metrics';

describe('검색 평가 지표', () => {
  it('손계산 fixture로 Recall@5, MRR@6와 graded nDCG@6를 계산한다', () => {
    const metrics = calculateRankingMetrics(
      ['irrelevant', 'supporting', 'core'],
      {
        core: 2,
        supporting: 1,
        irrelevant: 0,
      }
    );
    const expectedDcg = 1 / Math.log2(3) + 3 / Math.log2(4);
    const expectedIdealDcg = 3 + 1 / Math.log2(3);

    expect(metrics.recallAt5).toBe(1);
    expect(metrics.mrrAt6).toBe(0.5);
    expect(metrics.ndcgAt6).toBeCloseTo(expectedDcg / expectedIdealDcg, 12);
    expect(metrics.returnedResultCount).toBe(3);
  });

  it('관련 자료가 없는 negative query는 0점과 반환 결과 수를 분리한다', () => {
    expect(
      calculateRankingMetrics(['first', 'second'], {
        first: 0,
        second: 0,
      })
    ).toEqual({
      recallAt5: 0,
      mrrAt6: 0,
      ndcgAt6: 0,
      returnedResultCount: 2,
    });
  });

  it('query별 후보 점수를 wins, ties와 losses로 집계한다', () => {
    expect(
      compareQueryScores([
        { queryId: 'win', baselineScore: 0.4, candidateScore: 0.7 },
        { queryId: 'tie', baselineScore: 0.5, candidateScore: 0.5 },
        { queryId: 'loss', baselineScore: 0.8, candidateScore: 0.3 },
      ])
    ).toEqual({
      wins: 1,
      ties: 1,
      losses: 1,
    });
  });

  it('부동소수점 오차 범위의 같은 점수를 tie로 분류한다', () => {
    expect(
      compareQueryScores([
        {
          queryId: 'floating-point-tie',
          baselineScore: 0.5,
          candidateScore: 0.5 + Number.EPSILON,
        },
      ])
    ).toEqual({
      wins: 0,
      ties: 1,
      losses: 0,
    });
  });
});
