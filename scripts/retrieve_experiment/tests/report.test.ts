import { describe, expect, it } from 'vitest';

import type { ExperimentManifest } from '../experiment_manifest';
import {
  renderExplorationReport,
  type ExplorationCandidateId,
  type ExplorationQueryResult,
  type ExplorationReportData,
} from '../report';

const manifest = {
  schemaVersion: 1,
  dataset: {
    corpusVersion: 'exploratory-corpus-v1',
    querySetVersion: 'exploratory-queries-v1',
    corpusHash: 'a'.repeat(64),
    querySetHash: 'b'.repeat(64),
  },
  provider: {
    kind: 'local',
    name: 'transformers-js@4.2.0:cpu:q8',
    modelId: 'Xenova/multilingual-e5-small',
    modelRevision: 'c'.repeat(40),
    embeddingDimension: 384,
    documentTaskType: 'passage',
    queryTaskType: 'query',
  },
  cache: {
    namespace: 'retrieve-exploration',
    version: 'v1',
  },
  ranking: {
    resultLimit: 6,
    semanticCandidateDepth: 72,
    rrfPrimaryK: 60,
    rrfSensitivityK: 10,
  },
  randomSeed: 20260723,
  queryCounts: {
    lexical: { calibration: 10, check: 5 },
    semantic: { calibration: 10, check: 5 },
    negative: { calibration: 10, check: 5 },
  },
} satisfies ExperimentManifest;

describe('합성 탐색 보고서', () => {
  it('한계·threshold·query별 오류와 RRF 민감도를 함께 기록한다', () => {
    const report = renderExplorationReport(createReportData());

    expect(report).toContain('통계적 우월성을 증명하지 않음');
    expect(report).toContain(manifest.dataset.corpusHash);
    expect(report).toContain('negative calibration 상위 점수');
    expect(report).toContain('0.820000');
    expect(report).toContain('semantic-check-02');
    expect(report).toContain('critical miss');
    expect(report).toContain('negative-check-01');
    expect(report).toContain('결론 방향 뒤집힘: 예');
  });

  it('같은 입력에는 같은 Markdown을 만든다', () => {
    const data = createReportData();

    expect(renderExplorationReport(data)).toBe(renderExplorationReport(data));
  });
});

function createReportData(): ExplorationReportData {
  return {
    schemaVersion: 1,
    manifest,
    manifestHash: 'd'.repeat(64),
    threshold: {
      strategy: 'negative-calibration-percentiles',
      selectedThreshold: 0.82,
      candidates: [
        {
          threshold: 0.7,
          positiveMeanNdcgAt6: 0.8,
          positiveRecallAt5: 0.9,
          negativeMeanReturnedCount: 2,
        },
        {
          threshold: 0.78,
          positiveMeanNdcgAt6: 0.7,
          positiveRecallAt5: 0.8,
          negativeMeanReturnedCount: 0.5,
        },
        {
          threshold: 0.82,
          positiveMeanNdcgAt6: 0.6,
          positiveRecallAt5: 0.7,
          negativeMeanReturnedCount: 0,
        },
      ],
    },
    queries: [
      createQueryResult({
        queryId: 'semantic-check-01',
        text: '표현이 다른 첫 query',
        relevanceByInsightId: { 'insight-a': 2 },
        rankedIds: {
          'lexical-current': ['insight-x'],
          'semantic-local-e5': ['insight-a'],
          'hybrid-local-e5-k60': ['insight-a'],
          'hybrid-local-e5-k10': ['insight-x'],
        },
      }),
      createQueryResult({
        queryId: 'semantic-check-02',
        text: '표현이 다른 둘째 query',
        relevanceByInsightId: { 'insight-b': 2 },
        rankedIds: {
          'lexical-current': ['insight-b'],
          'semantic-local-e5': ['insight-x'],
          'hybrid-local-e5-k60': ['insight-b'],
          'hybrid-local-e5-k10': ['insight-x'],
        },
      }),
      createQueryResult({
        queryId: 'negative-check-01',
        text: '정답이 없는 query',
        slice: 'negative',
        relevanceByInsightId: {},
        rankedIds: {
          'lexical-current': [],
          'semantic-local-e5': ['insight-x'],
          'hybrid-local-e5-k60': ['insight-x'],
          'hybrid-local-e5-k10': ['insight-x'],
        },
      }),
    ],
  };
}

function createQueryResult(options: {
  queryId: string;
  text: string;
  slice?: 'semantic' | 'negative';
  relevanceByInsightId: ExplorationQueryResult['relevanceByInsightId'];
  rankedIds: Record<ExplorationCandidateId, readonly string[]>;
}): ExplorationQueryResult {
  function createCandidateResult(candidateId: ExplorationCandidateId) {
    const ranking = options.rankedIds[candidateId].map((insightId, index) => ({
      insightId,
      score: 1 - index * 0.1,
    }));
    const firstRelevantIndex = ranking.findIndex(
      ({ insightId }) => (options.relevanceByInsightId[insightId] ?? 0) > 0
    );
    const score = firstRelevantIndex < 0 ? 0 : 1;

    return {
      ranking,
      metrics: {
        recallAt5: score,
        mrrAt6: score,
        ndcgAt6: score,
        returnedResultCount: ranking.length,
      },
    };
  }

  return {
    queryId: options.queryId,
    text: options.text,
    slice: options.slice ?? 'semantic',
    phase: 'check',
    relevanceByInsightId: options.relevanceByInsightId,
    candidates: {
      'lexical-current': createCandidateResult('lexical-current'),
      'semantic-local-e5': createCandidateResult('semantic-local-e5'),
      'hybrid-local-e5-k60': createCandidateResult('hybrid-local-e5-k60'),
      'hybrid-local-e5-k10': createCandidateResult('hybrid-local-e5-k10'),
    },
  };
}
