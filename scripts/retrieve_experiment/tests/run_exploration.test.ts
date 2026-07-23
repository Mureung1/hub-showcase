import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  applySemanticThreshold,
  runExploration,
  selectCalibrationThresholds,
  writeExplorationArtifacts,
} from '../run_exploration';
import type { EmbeddingCache, EmbeddingProvider } from '../embedding_provider';

describe('합성 탐색 threshold calibration', () => {
  it('negative calibration 상위 점수의 50·90·100 분위만 후보로 만든다', () => {
    const selection = selectCalibrationThresholds([
      0.61, 0.65, 0.67, 0.7, 0.72, 0.75, 0.77, 0.8, 0.82, 0.85,
    ]);

    expect(selection.candidates).toEqual([0.72, 0.82, 0.85]);
    expect(selection.selectedThreshold).toBe(0.85);
  });

  it('중복 분위값은 한 번만 남긴다', () => {
    const selection = selectCalibrationThresholds([0.7, 0.7, 0.7, 0.7, 0.7]);

    expect(selection.candidates).toEqual([0.7]);
    expect(selection.selectedThreshold).toBe(0.7);
  });

  it('선택 threshold와 같은 점수도 반환하지 않는다', () => {
    expect(
      applySemanticThreshold(
        [
          { insightId: 'above', score: 0.86 },
          { insightId: 'equal', score: 0.85 },
          { insightId: 'below', score: 0.84 },
        ],
        0.85
      )
    ).toEqual([{ insightId: 'above', score: 0.86 }]);
  });

  it('negative calibration 점수가 없으면 실행을 거부한다', () => {
    expect(() => selectCalibrationThresholds([])).toThrow(
      /negative calibration/u
    );
  });
});

describe('합성 탐색 runner', () => {
  it('117개 embedding을 cache해 같은 평가에서 다시 계산하지 않는다', async () => {
    const embed = vi.fn<EmbeddingProvider['embed']>(async () => [1, 0]);
    const provider: EmbeddingProvider = {
      providerId: 'fixture-provider',
      modelId: 'fixture-model',
      modelRevision: 'fixture-revision',
      dimensions: 2,
      embed,
    };
    const cache = createMemoryCache();

    const first = await runExploration({ provider, cache });
    const second = await runExploration({ provider, cache });

    expect(first.queries).toHaveLength(45);
    expect(first.threshold.selectedThreshold).toBe(1);
    expect(
      first.queries.find(({ queryId }) => queryId === 'lexical-calibration-01')
        ?.candidates['lexical-current'].ranking[0]?.insightId
    ).toBe('dev-01');
    expect(first).toEqual(second);
    expect(embed).toHaveBeenCalledTimes(117);
  });

  it('JSON 결과와 Markdown 보고서를 함께 기록한다', async () => {
    const outputDirectory = await mkdtemp(
      join(tmpdir(), 'hub-retrieve-results-')
    );
    const provider: EmbeddingProvider = {
      providerId: 'fixture-provider',
      modelId: 'fixture-model',
      modelRevision: 'fixture-revision',
      dimensions: 2,
      async embed() {
        return [1, 0];
      },
    };

    try {
      const data = await runExploration({
        provider,
        cache: createMemoryCache(),
      });
      const paths = await writeExplorationArtifacts(data, outputDirectory);
      const resultJson = JSON.parse(
        await readFile(paths.resultPath, 'utf8')
      ) as { schemaVersion?: unknown };
      const report = await readFile(paths.reportPath, 'utf8');

      expect(resultJson.schemaVersion).toBe(1);
      expect(report).toContain('통계적 우월성을 증명하지 않음');
      expect(paths.resultPath).toBe(
        join(outputDirectory, 'exploration_result.json')
      );
      expect(paths.reportPath).toBe(
        join(outputDirectory, 'exploration_report.md')
      );
    } finally {
      await rm(outputDirectory, { recursive: true });
    }
  });
});

function createMemoryCache(): EmbeddingCache {
  const values = new Map<string, readonly number[]>();

  return {
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, vector) {
      values.set(key, [...vector]);
    },
  };
}
