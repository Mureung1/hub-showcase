import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { validateEvaluationQueries } from '../contracts';
import { stableStringify } from '../experiment_manifest';
import {
  EXPLORATORY_CORPUS,
  EXPLORATORY_CORPUS_HASH,
  EXPLORATORY_TOPIC_COUNTS,
} from '../fixtures/exploratory_corpus';
import {
  EXPLORATORY_QUERIES,
  EXPLORATORY_QUERY_SET_HASH,
} from '../fixtures/exploratory_queries';

const EXPECTED_TOPIC_COUNTS = {
  개발: 12,
  계정: 12,
  미디어: 12,
  여행: 12,
  프로젝트: 12,
  학습: 12,
} as const;

describe('합성 탐색 평가 fixture', () => {
  it('72개 insight를 6개 주제에 같은 수로 고정한다', () => {
    expect(EXPLORATORY_CORPUS).toHaveLength(72);
    expect(EXPLORATORY_TOPIC_COUNTS).toEqual(EXPECTED_TOPIC_COUNTS);

    const actualCounts = Object.fromEntries(
      Object.keys(EXPECTED_TOPIC_COUNTS).map((category) => [
        category,
        EXPLORATORY_CORPUS.filter((insight) => insight.category === category)
          .length,
      ])
    );

    expect(actualCounts).toEqual(EXPECTED_TOPIC_COUNTS);
  });

  it('insight ID와 URL·날짜 계약이 유효하다', () => {
    const insightIds = EXPLORATORY_CORPUS.map(({ id }) => id);

    expect(new Set(insightIds).size).toBe(EXPLORATORY_CORPUS.length);

    for (const insight of EXPLORATORY_CORPUS) {
      expect(insight.title.trim()).not.toBe('');
      expect(insight.memo?.trim()).not.toBe('');
      expect(new URL(insight.originalUrl).hostname).toBe(insight.domain);
      expect(Number.isFinite(Date.parse(insight.createdAt))).toBe(true);
    }
  });

  it('45개 query의 slice·phase 분포와 관련도 참조를 검증한다', () => {
    const corpusIds = new Set(EXPLORATORY_CORPUS.map(({ id }) => id));

    expect(EXPLORATORY_QUERIES).toHaveLength(45);
    expect(() => validateEvaluationQueries(EXPLORATORY_QUERIES)).not.toThrow();

    for (const query of EXPLORATORY_QUERIES) {
      for (const insightId of Object.keys(query.relevanceByInsightId)) {
        expect(corpusIds.has(insightId), `${query.id}: ${insightId}`).toBe(
          true
        );
      }
    }
  });

  it('positive query에는 핵심 정답이 있고 negative query에는 정답이 없다', () => {
    for (const query of EXPLORATORY_QUERIES) {
      const grades = Object.values(query.relevanceByInsightId);

      if (query.slice === 'negative') {
        expect(grades, query.id).toEqual([]);
      } else {
        expect(grades, query.id).toContain(2);
        expect(grades.every((grade) => grade === 1 || grade === 2)).toBe(true);
      }
    }
  });

  it('semantic query는 핵심 정답 문구를 그대로 복사하지 않는다', () => {
    const insightById = new Map(
      EXPLORATORY_CORPUS.map((insight) => [insight.id, insight])
    );

    for (const query of EXPLORATORY_QUERIES.filter(
      ({ slice }) => slice === 'semantic'
    )) {
      const coreInsightId = Object.entries(query.relevanceByInsightId).find(
        ([, grade]) => grade === 2
      )?.[0];
      const coreInsight = coreInsightId
        ? insightById.get(coreInsightId)
        : undefined;

      if (!coreInsight) {
        throw new Error(`${query.id}의 핵심 정답을 찾지 못했습니다.`);
      }

      const queryTokens = tokenize(query.text);
      const insightTokens = new Set(
        tokenize(`${coreInsight.title} ${coreInsight.memo ?? ''}`)
      );
      const sharedTokens = queryTokens.filter((token) =>
        insightTokens.has(token)
      );

      expect(
        sharedTokens.length,
        `${query.id}: ${sharedTokens.join(', ')}`
      ).toBeLessThanOrEqual(1);
    }
  });

  it('corpus와 query set의 golden SHA-256을 유지한다', () => {
    expect(createFixtureHash(EXPLORATORY_CORPUS)).toBe(EXPLORATORY_CORPUS_HASH);
    expect(createFixtureHash(EXPLORATORY_QUERIES)).toBe(
      EXPLORATORY_QUERY_SET_HASH
    );
  });
});

function createFixtureHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function tokenize(value: string): string[] {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}
