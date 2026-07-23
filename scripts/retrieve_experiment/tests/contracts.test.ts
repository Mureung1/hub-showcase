import { describe, expect, it } from 'vitest';

import {
  EXPECTED_QUERY_COUNTS,
  validateEvaluationQueries,
  type EvaluationInsight,
  type EvaluationQuery,
  type RelevanceGrade,
} from '../contracts';

const INSIGHT_ID = 'insight-1';

const exampleInsight = {
  id: INSIGHT_ID,
  title: 'React 폼 검증',
  memo: '팀 프로젝트 로그인 구현',
  category: '개발',
  domain: 'react.dev',
  originalUrl: 'https://react.dev/learn/forms',
  createdAt: '2026-07-10T09:00:00.000Z',
} satisfies EvaluationInsight;

function createValidQueries(): EvaluationQuery[] {
  return Object.entries(EXPECTED_QUERY_COUNTS).flatMap(
    ([slice, phaseCounts]) => {
      return Object.entries(phaseCounts).flatMap(([phase, count]) => {
        return Array.from({ length: count }, (_, index) => ({
          id: `${slice}-${phase}-${index + 1}`,
          text: `${slice} ${phase} 상황 ${index + 1}`,
          slice: slice as EvaluationQuery['slice'],
          phase: phase as EvaluationQuery['phase'],
          relevanceByInsightId: {
            [INSIGHT_ID]: slice === 'negative' ? 0 : 2,
          },
        }));
      });
    }
  );
}

describe('평가 데이터 계약', () => {
  it('corpus, query와 관련도 0·1·2를 명시적으로 표현한다', () => {
    const relevanceGrades = [0, 1, 2] satisfies RelevanceGrade[];
    const queries = createValidQueries();

    expect(exampleInsight.memo).toBe('팀 프로젝트 로그인 구현');
    expect(relevanceGrades).toEqual([0, 1, 2]);
    expect(() => validateEvaluationQueries(queries)).not.toThrow();
  });

  it('관련도 0·1·2 이외의 값을 거부한다', () => {
    const queries = createValidQueries();
    queries[0] = {
      ...queries[0],
      relevanceByInsightId: {
        [INSIGHT_ID]: 3,
      },
    } as unknown as EvaluationQuery;

    expect(() => validateEvaluationQueries(queries)).toThrow(
      /관련도.*0, 1, 2/u
    );
  });

  it('calibration과 check 사이에 겹치는 query ID를 거부한다', () => {
    const queries = createValidQueries();
    const calibrationQuery = queries.find(
      ({ phase, slice }) => phase === 'calibration' && slice === 'lexical'
    );
    const checkQueryIndex = queries.findIndex(
      ({ phase, slice }) => phase === 'check' && slice === 'lexical'
    );

    if (!calibrationQuery || checkQueryIndex < 0) {
      throw new Error('테스트 query fixture를 만들지 못했습니다.');
    }

    queries[checkQueryIndex] = {
      ...queries[checkQueryIndex],
      id: calibrationQuery.id,
    };

    expect(() => validateEvaluationQueries(queries)).toThrow(/query ID.*중복/u);
  });

  it('slice와 phase별 query 수가 고정 계약과 다르면 거부한다', () => {
    const queries = createValidQueries().filter(
      ({ id }) => id !== 'semantic-check-5'
    );

    expect(() => validateEvaluationQueries(queries)).toThrow(
      /semantic\/check.*5.*4/u
    );
  });
});
