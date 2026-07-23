export const QUERY_SLICES = ['lexical', 'semantic', 'negative'] as const;
export const QUERY_PHASES = ['calibration', 'check'] as const;

export type QuerySlice = (typeof QUERY_SLICES)[number];
export type QueryPhase = (typeof QUERY_PHASES)[number];

export const EXPECTED_QUERY_COUNTS = {
  lexical: {
    calibration: 10,
    check: 5,
  },
  semantic: {
    calibration: 10,
    check: 5,
  },
  negative: {
    calibration: 10,
    check: 5,
  },
} as const;

export type RelevanceGrade = 0 | 1 | 2;

export type EvaluationInsight = {
  id: string;
  title: string;
  memo: string | null;
  category: string | null;
  domain: string;
  originalUrl: string;
  createdAt: string;
};

export type EvaluationQuery = {
  id: string;
  text: string;
  slice: QuerySlice;
  phase: QueryPhase;
  relevanceByInsightId: Readonly<Record<string, RelevanceGrade>>;
};

export function validateEvaluationQueries(
  queries: readonly EvaluationQuery[]
): void {
  const queryIds = new Set<string>();
  const counts = createEmptyQueryCounts();

  for (const query of queries) {
    assertNonEmptyString(query.id, 'query ID');
    assertNonEmptyString(query.text, `query ${query.id}의 text`);

    if (queryIds.has(query.id)) {
      throw new Error(`query ID가 중복됐습니다: ${query.id}`);
    }

    queryIds.add(query.id);
    assertQuerySlice(query.slice, query.id);
    assertQueryPhase(query.phase, query.id);
    counts[query.slice][query.phase] += 1;
    validateRelevanceLabels(query);
  }

  for (const slice of QUERY_SLICES) {
    for (const phase of QUERY_PHASES) {
      const expected = EXPECTED_QUERY_COUNTS[slice][phase];
      const received = counts[slice][phase];

      if (received !== expected) {
        throw new Error(
          `${slice}/${phase} query 수는 ${expected}개여야 하지만 ${received}개입니다.`
        );
      }
    }
  }
}

function createEmptyQueryCounts(): Record<
  QuerySlice,
  Record<QueryPhase, number>
> {
  return {
    lexical: { calibration: 0, check: 0 },
    semantic: { calibration: 0, check: 0 },
    negative: { calibration: 0, check: 0 },
  };
}

function assertQuerySlice(
  value: string,
  queryId: string
): asserts value is QuerySlice {
  if (!QUERY_SLICES.some((slice) => slice === value)) {
    throw new Error(`query ${queryId}의 slice가 유효하지 않습니다: ${value}`);
  }
}

function assertQueryPhase(
  value: string,
  queryId: string
): asserts value is QueryPhase {
  if (!QUERY_PHASES.some((phase) => phase === value)) {
    throw new Error(`query ${queryId}의 phase가 유효하지 않습니다: ${value}`);
  }
}

function validateRelevanceLabels(query: EvaluationQuery): void {
  if (!isRecord(query.relevanceByInsightId)) {
    throw new Error(
      `query ${query.id}의 relevanceByInsightId는 객체여야 합니다.`
    );
  }

  for (const [insightId, grade] of Object.entries(query.relevanceByInsightId)) {
    assertNonEmptyString(insightId, `query ${query.id}의 insight ID`);

    if (grade !== 0 && grade !== 1 && grade !== 2) {
      throw new Error(
        `query ${query.id}의 관련도는 0, 1, 2 중 하나여야 합니다: ${String(grade)}`
      );
    }
  }
}

function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName}은 비어 있지 않은 문자열이어야 합니다.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
