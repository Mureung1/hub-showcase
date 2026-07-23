import type { QueryPhase, QuerySlice, RelevanceGrade } from './contracts';
import type { ExperimentManifest } from './experiment_manifest';
import {
  compareQueryScores,
  type QueryScoreSummary,
  type RankingMetrics,
} from './metrics';
import type { RankedInsight } from './ranking';

export type ExplorationCandidateId =
  | 'lexical-current'
  | 'semantic-local-e5'
  | 'hybrid-local-e5-k60'
  | 'hybrid-local-e5-k10';

export type ExplorationCandidateResult = Readonly<{
  ranking: readonly RankedInsight[];
  metrics: RankingMetrics;
}>;

export type ExplorationQueryResult = Readonly<{
  queryId: string;
  text: string;
  slice: QuerySlice;
  phase: QueryPhase;
  relevanceByInsightId: Readonly<Record<string, RelevanceGrade>>;
  candidates: Readonly<
    Record<ExplorationCandidateId, ExplorationCandidateResult>
  >;
}>;

export type ThresholdCandidateEvaluation = Readonly<{
  threshold: number;
  positiveMeanNdcgAt6: number;
  positiveRecallAt5: number;
  negativeMeanReturnedCount: number;
}>;

export type ExplorationReportData = Readonly<{
  schemaVersion: 1;
  manifest: ExperimentManifest;
  manifestHash: string;
  threshold: Readonly<{
    strategy: 'negative-calibration-percentiles';
    selectedThreshold: number;
    candidates: readonly ThresholdCandidateEvaluation[];
  }>;
  queries: readonly ExplorationQueryResult[];
}>;

const CANDIDATE_IDS = [
  'lexical-current',
  'semantic-local-e5',
  'hybrid-local-e5-k60',
  'hybrid-local-e5-k10',
] as const satisfies readonly ExplorationCandidateId[];

const CANDIDATE_LABELS: Record<ExplorationCandidateId, string> = {
  'lexical-current': '현행 어휘 검색',
  'semantic-local-e5': '로컬 E5 의미 검색',
  'hybrid-local-e5-k60': '로컬 E5 하이브리드 k=60',
  'hybrid-local-e5-k10': '로컬 E5 하이브리드 k=10',
};

const QUERY_SLICES = ['lexical', 'semantic', 'negative'] as const;
const QUERY_PHASES = ['calibration', 'check'] as const;

export function renderExplorationReport(data: ExplorationReportData): string {
  const sections = [
    '# 꺼내보기 로컬 E5 합성 탐색 결과',
    [
      '> **해석 제한: 이 합성 평가는 통계적 우월성을 증명하지 않음.**',
      '> 작은 고정 corpus에서 실패 유형을 찾고 실제 개인 데이터 파일럿 후보를 고르기 위한 탐색 결과다.',
    ].join('\n'),
    renderManifestSection(data),
    renderThresholdSection(data),
    renderAggregateSection(data),
    renderComparisonSection(data),
    renderRrfSensitivitySection(data),
    renderCriticalMissSection(data),
    renderNegativeSection(data),
    renderQueryDetails(data),
  ];

  return `${sections.join('\n\n')}\n`;
}

function renderManifestSection(data: ExplorationReportData): string {
  return [
    '## 실행 계약',
    '',
    '| 항목 | 값 |',
    '| --- | --- |',
    `| manifest SHA-256 | \`${data.manifestHash}\` |`,
    `| corpus 버전 | \`${data.manifest.dataset.corpusVersion}\` |`,
    `| corpus SHA-256 | \`${data.manifest.dataset.corpusHash}\` |`,
    `| query 버전 | \`${data.manifest.dataset.querySetVersion}\` |`,
    `| query SHA-256 | \`${data.manifest.dataset.querySetHash}\` |`,
    `| 공급자 | \`${data.manifest.provider.name}\` |`,
    `| 모델 | \`${data.manifest.provider.modelId}\` |`,
    `| 모델 리비전 | \`${data.manifest.provider.modelRevision}\` |`,
  ].join('\n');
}

function renderThresholdSection(data: ExplorationReportData): string {
  const rows = data.threshold.candidates.map((candidate) => {
    return [
      formatScore(candidate.threshold),
      formatScore(candidate.positiveRecallAt5),
      formatScore(candidate.positiveMeanNdcgAt6),
      formatScore(candidate.negativeMeanReturnedCount),
      candidate.threshold === data.threshold.selectedThreshold ? '선택' : '',
    ];
  });

  return [
    '## Semantic threshold calibration',
    '',
    '외부 기본값을 가져오지 않고 negative calibration 상위 점수의 50·90·100 분위만 비교했다.',
    '선택값은 가장 높은 negative calibration 점수이며, 실제 반환은 이 값을 **엄격히 초과**한 결과만 허용한다.',
    '',
    '| threshold | positive Recall@5 | positive nDCG@6 | negative 평균 반환 수 | 상태 |',
    '| ---: | ---: | ---: | ---: | --- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
    `선택 threshold: \`${formatScore(data.threshold.selectedThreshold)}\``,
  ].join('\n');
}

function renderAggregateSection(data: ExplorationReportData): string {
  const rows: string[] = [];

  for (const slice of QUERY_SLICES) {
    for (const phase of QUERY_PHASES) {
      const queries = data.queries.filter(
        (query) => query.slice === slice && query.phase === phase
      );

      if (queries.length === 0) {
        continue;
      }

      for (const candidateId of CANDIDATE_IDS) {
        const metrics = queries.map(
          (query) => query.candidates[candidateId].metrics
        );

        rows.push(
          `| ${slice} | ${phase} | ${CANDIDATE_LABELS[candidateId]} | ${formatScore(mean(metrics.map(({ recallAt5 }) => recallAt5)))} | ${formatScore(mean(metrics.map(({ mrrAt6 }) => mrrAt6)))} | ${formatScore(mean(metrics.map(({ ndcgAt6 }) => ndcgAt6)))} | ${formatScore(mean(metrics.map(({ returnedResultCount }) => returnedResultCount)))} |`
        );
      }
    }
  }

  return [
    '## Slice·phase 집계',
    '',
    '| slice | phase | 후보 | Recall@5 | MRR@6 | nDCG@6 | 평균 반환 수 |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: |',
    ...rows,
  ].join('\n');
}

function renderComparisonSection(data: ExplorationReportData): string {
  const positiveQueries = data.queries.filter(
    ({ slice }) => slice !== 'negative'
  );
  const rows = CANDIDATE_IDS.filter(
    (candidateId) => candidateId !== 'lexical-current'
  ).map((candidateId) => {
    const summary = summarizeAgainstBaseline(positiveQueries, candidateId);

    return `| ${CANDIDATE_LABELS[candidateId]} | ${summary.wins} | ${summary.ties} | ${summary.losses} |`;
  });

  return [
    '## 현행 대비 query별 nDCG@6',
    '',
    '| 후보 | wins | ties | losses |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
  ].join('\n');
}

function renderRrfSensitivitySection(data: ExplorationReportData): string {
  const positiveQueries = data.queries.filter(
    ({ slice }) => slice !== 'negative'
  );
  const primary = summarizeAgainstBaseline(
    positiveQueries,
    'hybrid-local-e5-k60'
  );
  const sensitivity = summarizeAgainstBaseline(
    positiveQueries,
    'hybrid-local-e5-k10'
  );
  const isReversed =
    compareWinLossDirection(primary) !== compareWinLossDirection(sensitivity);

  return [
    '## RRF 민감도',
    '',
    `- k=60: ${primary.wins}승 ${primary.ties}무 ${primary.losses}패`,
    `- k=10: ${sensitivity.wins}승 ${sensitivity.ties}무 ${sensitivity.losses}패`,
    `- 결론 방향 뒤집힘: ${isReversed ? '예' : '아니요'}`,
  ].join('\n');
}

function renderCriticalMissSection(data: ExplorationReportData): string {
  const lines: string[] = [];

  for (const query of data.queries) {
    const coreInsightIds = Object.entries(query.relevanceByInsightId)
      .filter(([, grade]) => grade === 2)
      .map(([insightId]) => insightId);
    const baselineIds = new Set(
      query.candidates['lexical-current'].ranking
        .slice(0, 6)
        .map(({ insightId }) => insightId)
    );

    for (const candidateId of CANDIDATE_IDS.filter(
      (id) => id !== 'lexical-current'
    )) {
      const candidateIds = new Set(
        query.candidates[candidateId].ranking
          .slice(0, 6)
          .map(({ insightId }) => insightId)
      );
      const missedIds = coreInsightIds.filter(
        (insightId) =>
          baselineIds.has(insightId) && !candidateIds.has(insightId)
      );

      if (missedIds.length > 0) {
        lines.push(
          `- ${query.queryId} · ${CANDIDATE_LABELS[candidateId]} · ${missedIds.join(', ')}`
        );
      }
    }
  }

  return [
    '## critical miss',
    '',
    ...(lines.length > 0
      ? lines
      : ['현행이 찾은 관련도 2 자료를 후보가 놓친 사례가 없다.']),
  ].join('\n');
}

function renderNegativeSection(data: ExplorationReportData): string {
  const negativeQueries = data.queries.filter(
    ({ slice }) => slice === 'negative'
  );
  const rows = negativeQueries.flatMap((query) => {
    return CANDIDATE_IDS.map((candidateId) => {
      const count = query.candidates[candidateId].metrics.returnedResultCount;

      return `| ${query.queryId} | ${query.phase} | ${CANDIDATE_LABELS[candidateId]} | ${count} |`;
    });
  });

  return [
    '## Negative query 반환 수',
    '',
    '| query | phase | 후보 | 반환 수 |',
    '| --- | --- | --- | ---: |',
    ...rows,
  ].join('\n');
}

function renderQueryDetails(data: ExplorationReportData): string {
  const sections = [...data.queries]
    .sort((current, next) => current.queryId.localeCompare(next.queryId))
    .map((query) => {
      const rows = CANDIDATE_IDS.map((candidateId) => {
        const result = query.candidates[candidateId];
        const ranking = result.ranking
          .slice(0, 6)
          .map(({ insightId, score }) => {
            const grade = query.relevanceByInsightId[insightId] ?? 0;

            return `${insightId}(g${grade}, ${formatScore(score)})`;
          })
          .join('<br>');

        return `| ${CANDIDATE_LABELS[candidateId]} | ${ranking || '-'} | ${formatScore(result.metrics.recallAt5)} | ${formatScore(result.metrics.ndcgAt6)} |`;
      });

      return [
        `### ${query.queryId} · ${query.slice}/${query.phase}`,
        '',
        query.text,
        '',
        '| 후보 | 상위 결과 | Recall@5 | nDCG@6 |',
        '| --- | --- | ---: | ---: |',
        ...rows,
      ].join('\n');
    });

  return ['## Query별 결과와 오류 사례', '', ...sections].join('\n\n');
}

function summarizeAgainstBaseline(
  queries: readonly ExplorationQueryResult[],
  candidateId: ExplorationCandidateId
): QueryScoreSummary {
  return compareQueryScores(
    queries.map((query) => ({
      queryId: query.queryId,
      baselineScore: query.candidates['lexical-current'].metrics.ndcgAt6,
      candidateScore: query.candidates[candidateId].metrics.ndcgAt6,
    }))
  );
}

function compareWinLossDirection(summary: QueryScoreSummary): number {
  return Math.sign(summary.wins - summary.losses);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatScore(value: number): string {
  return value.toFixed(6);
}
