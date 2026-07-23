import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  EXPECTED_QUERY_COUNTS,
  validateEvaluationQueries,
  type EvaluationQuery,
} from './contracts';
import type { EmbeddingCache, EmbeddingProvider } from './embedding_provider';
import { createFileEmbeddingCache, embedWithCache } from './embedding_provider';
import {
  createExperimentManifestHash,
  stableStringify,
  type ExperimentManifest,
} from './experiment_manifest';
import {
  EXPLORATORY_CORPUS,
  EXPLORATORY_CORPUS_HASH,
} from './fixtures/exploratory_corpus';
import {
  EXPLORATORY_QUERIES,
  EXPLORATORY_QUERY_SET_HASH,
} from './fixtures/exploratory_queries';
import { calculateRankingMetrics } from './metrics';
import {
  renderExplorationReport,
  type ExplorationCandidateResult,
  type ExplorationQueryResult,
  type ExplorationReportData,
  type ThresholdCandidateEvaluation,
} from './report';
import { createLocalE5EmbeddingProvider } from './local_e5_embedding_provider';
import {
  fuseRankings,
  rankByCosine,
  rankLexically,
  type EmbeddedInsight,
  type RankedInsight,
} from './ranking';

export type CalibrationThresholdSelection = Readonly<{
  candidates: readonly number[];
  selectedThreshold: number;
}>;

export type RunExplorationOptions = Readonly<{
  provider: EmbeddingProvider;
  cache: EmbeddingCache;
}>;

export type ExplorationArtifactPaths = Readonly<{
  resultPath: string;
  reportPath: string;
}>;

export function selectCalibrationThresholds(
  negativeTopScores: readonly number[]
): CalibrationThresholdSelection {
  if (negativeTopScores.length === 0) {
    throw new Error('negative calibration 상위 점수가 필요합니다.');
  }

  if (negativeTopScores.some((score) => !Number.isFinite(score))) {
    throw new Error('negative calibration 상위 점수는 유한한 숫자여야 합니다.');
  }

  const sortedScores = [...negativeTopScores].sort(
    (current, next) => current - next
  );
  const candidates = Array.from(
    new Set(
      [0.5, 0.9, 1].map((quantile) =>
        selectNearestRankQuantile(sortedScores, quantile)
      )
    )
  ).sort((current, next) => current - next);
  const selectedThreshold = candidates.at(-1);

  if (selectedThreshold === undefined) {
    throw new Error('negative calibration threshold를 선택하지 못했습니다.');
  }

  return {
    candidates,
    selectedThreshold,
  };
}

export function applySemanticThreshold(
  ranking: readonly RankedInsight[],
  threshold: number
): RankedInsight[] {
  if (!Number.isFinite(threshold)) {
    throw new Error('semantic threshold는 유한한 숫자여야 합니다.');
  }

  return ranking.filter(({ score }) => score > threshold);
}

export async function runExploration(
  options: RunExplorationOptions
): Promise<ExplorationReportData> {
  validateFixtureHashes();
  validateEvaluationQueries(EXPLORATORY_QUERIES);

  const manifest = createManifest(options.provider);
  const embeddedInsights = await embedCorpus(options);
  const rawSemanticRankingByQueryId = new Map<string, RankedInsight[]>();

  for (const query of EXPLORATORY_QUERIES) {
    const queryVector = await embedWithCache({
      provider: options.provider,
      cache: options.cache,
      request: {
        text: query.text,
        taskType: 'query',
      },
    });

    rawSemanticRankingByQueryId.set(
      query.id,
      rankByCosine(queryVector, embeddedInsights).slice(
        0,
        manifest.ranking.semanticCandidateDepth
      )
    );
  }

  const negativeTopScores = EXPLORATORY_QUERIES.filter(
    ({ phase, slice }) => phase === 'calibration' && slice === 'negative'
  ).map((query) => {
    const topScore = rawSemanticRankingByQueryId.get(query.id)?.[0]?.score;

    if (topScore === undefined) {
      throw new Error(
        `negative calibration query의 상위 점수가 없습니다: ${query.id}`
      );
    }

    return topScore;
  });
  const thresholdSelection = selectCalibrationThresholds(negativeTopScores);
  const thresholdCandidates = thresholdSelection.candidates.map((threshold) =>
    evaluateThreshold(
      threshold,
      EXPLORATORY_QUERIES,
      rawSemanticRankingByQueryId,
      manifest.ranking.resultLimit
    )
  );
  const queries = EXPLORATORY_QUERIES.map((query) =>
    evaluateQuery(
      query,
      rawSemanticRankingByQueryId,
      thresholdSelection.selectedThreshold,
      manifest
    )
  );

  return {
    schemaVersion: 1,
    manifest,
    manifestHash: createExperimentManifestHash(manifest),
    threshold: {
      strategy: 'negative-calibration-percentiles',
      selectedThreshold: thresholdSelection.selectedThreshold,
      candidates: thresholdCandidates,
    },
    queries,
  };
}

export async function writeExplorationArtifacts(
  data: ExplorationReportData,
  outputDirectory: string
): Promise<ExplorationArtifactPaths> {
  const resolvedOutputDirectory = resolve(outputDirectory);
  const resultPath = join(resolvedOutputDirectory, 'exploration_result.json');
  const reportPath = join(resolvedOutputDirectory, 'exploration_report.md');

  await mkdir(resolvedOutputDirectory, { recursive: true });
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8'),
    writeFile(reportPath, renderExplorationReport(data), 'utf8'),
  ]);

  return {
    resultPath,
    reportPath,
  };
}

function createManifest(provider: EmbeddingProvider): ExperimentManifest {
  return {
    schemaVersion: 1,
    dataset: {
      corpusVersion: 'exploratory-corpus-v1',
      querySetVersion: 'exploratory-queries-v1',
      corpusHash: EXPLORATORY_CORPUS_HASH,
      querySetHash: EXPLORATORY_QUERY_SET_HASH,
    },
    provider: {
      kind: 'local',
      name: provider.providerId,
      modelId: provider.modelId,
      modelRevision: provider.modelRevision,
      embeddingDimension: provider.dimensions,
      documentTaskType: 'passage',
      queryTaskType: 'query',
    },
    cache: {
      namespace: 'retrieve-exploration',
      version: 'v1',
    },
    ranking: {
      resultLimit: 6,
      semanticCandidateDepth: EXPLORATORY_CORPUS.length,
      rrfPrimaryK: 60,
      rrfSensitivityK: 10,
    },
    randomSeed: 20260723,
    queryCounts: {
      lexical: { ...EXPECTED_QUERY_COUNTS.lexical },
      semantic: { ...EXPECTED_QUERY_COUNTS.semantic },
      negative: { ...EXPECTED_QUERY_COUNTS.negative },
    },
  };
}

async function embedCorpus(
  options: RunExplorationOptions
): Promise<EmbeddedInsight[]> {
  const embeddedInsights: EmbeddedInsight[] = [];

  for (const insight of EXPLORATORY_CORPUS) {
    const vector = await embedWithCache({
      provider: options.provider,
      cache: options.cache,
      request: {
        text: createPassageText(insight),
        taskType: 'passage',
      },
    });

    embeddedInsights.push({
      insightId: insight.id,
      vector,
    });
  }

  return embeddedInsights;
}

function createPassageText(insight: (typeof EXPLORATORY_CORPUS)[number]) {
  return [
    `제목: ${insight.title}`,
    `메모: ${insight.memo ?? ''}`,
    `카테고리: ${insight.category ?? ''}`,
    `도메인: ${insight.domain}`,
  ].join('\n');
}

function evaluateThreshold(
  threshold: number,
  queries: readonly EvaluationQuery[],
  rawSemanticRankingByQueryId: ReadonlyMap<string, readonly RankedInsight[]>,
  resultLimit: number
): ThresholdCandidateEvaluation {
  const positiveMetrics = queries
    .filter(
      ({ phase, slice }) => phase === 'calibration' && slice !== 'negative'
    )
    .map((query) => {
      const ranking = getThresholdedRanking(
        query.id,
        rawSemanticRankingByQueryId,
        threshold
      ).slice(0, resultLimit);

      return calculateRankingMetrics(
        ranking.map(({ insightId }) => insightId),
        query.relevanceByInsightId
      );
    });
  const negativeResultCounts = queries
    .filter(
      ({ phase, slice }) => phase === 'calibration' && slice === 'negative'
    )
    .map((query) => {
      return getThresholdedRanking(
        query.id,
        rawSemanticRankingByQueryId,
        threshold
      ).slice(0, resultLimit).length;
    });

  return {
    threshold,
    positiveMeanNdcgAt6: mean(positiveMetrics.map(({ ndcgAt6 }) => ndcgAt6)),
    positiveRecallAt5: mean(positiveMetrics.map(({ recallAt5 }) => recallAt5)),
    negativeMeanReturnedCount: mean(negativeResultCounts),
  };
}

function evaluateQuery(
  query: EvaluationQuery,
  rawSemanticRankingByQueryId: ReadonlyMap<string, readonly RankedInsight[]>,
  threshold: number,
  manifest: ExperimentManifest
): ExplorationQueryResult {
  const lexicalRanking = rankLexically(EXPLORATORY_CORPUS, query.text);
  const semanticRanking = getThresholdedRanking(
    query.id,
    rawSemanticRankingByQueryId,
    threshold
  );
  const primaryHybridRanking = fuseRankings(
    {
      lexical: lexicalRanking.map(({ insightId }) => insightId),
      semantic: semanticRanking.map(({ insightId }) => insightId),
    },
    manifest.ranking.rrfPrimaryK
  );
  const sensitivityHybridRanking = fuseRankings(
    {
      lexical: lexicalRanking.map(({ insightId }) => insightId),
      semantic: semanticRanking.map(({ insightId }) => insightId),
    },
    manifest.ranking.rrfSensitivityK
  );
  const resultLimit = manifest.ranking.resultLimit;

  return {
    queryId: query.id,
    text: query.text,
    slice: query.slice,
    phase: query.phase,
    relevanceByInsightId: query.relevanceByInsightId,
    candidates: {
      'lexical-current': createCandidateResult(
        lexicalRanking,
        query,
        resultLimit
      ),
      'semantic-local-e5': createCandidateResult(
        semanticRanking,
        query,
        resultLimit
      ),
      'hybrid-local-e5-k60': createCandidateResult(
        primaryHybridRanking,
        query,
        resultLimit
      ),
      'hybrid-local-e5-k10': createCandidateResult(
        sensitivityHybridRanking,
        query,
        resultLimit
      ),
    },
  };
}

function createCandidateResult(
  ranking: readonly RankedInsight[],
  query: EvaluationQuery,
  resultLimit: number
): ExplorationCandidateResult {
  const limitedRanking = ranking.slice(0, resultLimit);

  return {
    ranking: limitedRanking,
    metrics: calculateRankingMetrics(
      limitedRanking.map(({ insightId }) => insightId),
      query.relevanceByInsightId
    ),
  };
}

function getThresholdedRanking(
  queryId: string,
  rawSemanticRankingByQueryId: ReadonlyMap<string, readonly RankedInsight[]>,
  threshold: number
): RankedInsight[] {
  const ranking = rawSemanticRankingByQueryId.get(queryId);

  if (!ranking) {
    throw new Error(`semantic ranking이 없습니다: ${queryId}`);
  }

  return applySemanticThreshold(ranking, threshold);
}

function validateFixtureHashes(): void {
  const corpusHash = createStableHash(EXPLORATORY_CORPUS);
  const querySetHash = createStableHash(EXPLORATORY_QUERIES);

  if (corpusHash !== EXPLORATORY_CORPUS_HASH) {
    throw new Error(`합성 corpus SHA-256이 고정값과 다릅니다: ${corpusHash}`);
  }

  if (querySetHash !== EXPLORATORY_QUERY_SET_HASH) {
    throw new Error(`합성 query SHA-256이 고정값과 다릅니다: ${querySetHash}`);
  }
}

function createStableHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function runExplorationCommand(): Promise<void> {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const provider = createLocalE5EmbeddingProvider();
  const cache = createFileEmbeddingCache(
    join(scriptDirectory, '.cache', 'embeddings')
  );
  const data = await runExploration({ provider, cache });
  const paths = await writeExplorationArtifacts(
    data,
    join(scriptDirectory, 'results')
  );

  process.stdout.write(
    `${JSON.stringify({
      manifestHash: data.manifestHash,
      selectedThreshold: data.threshold.selectedThreshold,
      resultPath: paths.resultPath,
      reportPath: paths.reportPath,
    })}\n`
  );
}

const entrypoint = process.argv[1];

if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  void runExplorationCommand().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : '알 수 없는 실행 오류입니다.';

    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

function selectNearestRankQuantile(
  sortedValues: readonly number[],
  quantile: number
): number {
  const index = Math.max(0, Math.ceil(quantile * sortedValues.length) - 1);
  const value = sortedValues[index];

  if (value === undefined) {
    throw new Error('분위값을 계산할 점수가 없습니다.');
  }

  return value;
}
