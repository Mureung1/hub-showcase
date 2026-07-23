import { describe, expect, it } from 'vitest';

import {
  assertExternalExecutionApproved,
  createExperimentManifestHash,
  stableStringify,
  validateExperimentManifest,
  type ExperimentManifest,
} from '../experiment_manifest';

function createLocalManifest(): ExperimentManifest {
  return {
    schemaVersion: 1,
    dataset: {
      corpusVersion: 'exploratory-corpus-v1',
      querySetVersion: 'exploratory-query-v1',
      corpusHash: 'a'.repeat(64),
      querySetHash: 'b'.repeat(64),
    },
    provider: {
      kind: 'local',
      name: 'transformers.js',
      modelId: 'Xenova/multilingual-e5-small',
      modelRevision: 'pinned-revision',
      embeddingDimension: 384,
      documentTaskType: 'passage',
      queryTaskType: 'query',
    },
    cache: {
      namespace: 'retrieve-experiment',
      version: 'v1',
    },
    ranking: {
      resultLimit: 6,
      semanticCandidateDepth: 20,
      rrfPrimaryK: 60,
      rrfSensitivityK: 10,
    },
    randomSeed: 20260723,
    queryCounts: {
      lexical: { calibration: 10, check: 5 },
      semantic: { calibration: 10, check: 5 },
      negative: { calibration: 10, check: 5 },
    },
  };
}

function createExternalManifest(
  approval: ExperimentManifest['externalApproval']
): ExperimentManifest {
  return {
    ...createLocalManifest(),
    provider: {
      ...createLocalManifest().provider,
      kind: 'external',
      name: 'gemini',
      modelId: 'approved-model',
    },
    externalApproval: approval,
  };
}

describe('실험 manifest 계약', () => {
  it('필수 모델 정보가 빠진 manifest를 거부한다', () => {
    const manifest = createLocalManifest();
    const invalidManifest = {
      ...manifest,
      provider: {
        kind: manifest.provider.kind,
        name: manifest.provider.name,
      },
    };

    expect(() => validateExperimentManifest(invalidManifest)).toThrow(
      /provider\.modelId/u
    );
  });

  it('필수 cache와 랭킹 정보가 빠진 manifest를 거부한다', () => {
    const manifest = createLocalManifest();
    const invalidManifest = {
      ...manifest,
      cache: {
        namespace: manifest.cache.namespace,
      },
      ranking: {
        resultLimit: manifest.ranking.resultLimit,
      },
    };

    expect(() => validateExperimentManifest(invalidManifest)).toThrow(
      /cache\.version|ranking\./u
    );
  });

  it('같은 manifest에서 항상 같은 SHA-256을 만든다', () => {
    const manifest = createLocalManifest();

    expect(createExperimentManifestHash(manifest)).toBe(
      createExperimentManifestHash(manifest)
    );
    expect(createExperimentManifestHash(manifest)).toMatch(/^[a-f0-9]{64}$/u);
  });

  it('object key 순서가 달라도 같은 직렬화와 SHA-256을 만든다', () => {
    const manifest = createLocalManifest();
    const reorderedManifest = {
      queryCounts: manifest.queryCounts,
      randomSeed: manifest.randomSeed,
      ranking: {
        rrfSensitivityK: manifest.ranking.rrfSensitivityK,
        semanticCandidateDepth: manifest.ranking.semanticCandidateDepth,
        resultLimit: manifest.ranking.resultLimit,
        rrfPrimaryK: manifest.ranking.rrfPrimaryK,
      },
      cache: {
        version: manifest.cache.version,
        namespace: manifest.cache.namespace,
      },
      provider: {
        queryTaskType: manifest.provider.queryTaskType,
        embeddingDimension: manifest.provider.embeddingDimension,
        modelRevision: manifest.provider.modelRevision,
        name: manifest.provider.name,
        documentTaskType: manifest.provider.documentTaskType,
        kind: manifest.provider.kind,
        modelId: manifest.provider.modelId,
      },
      dataset: {
        querySetHash: manifest.dataset.querySetHash,
        corpusHash: manifest.dataset.corpusHash,
        querySetVersion: manifest.dataset.querySetVersion,
        corpusVersion: manifest.dataset.corpusVersion,
      },
      schemaVersion: manifest.schemaVersion,
    } satisfies ExperimentManifest;

    expect(stableStringify(reorderedManifest)).toBe(stableStringify(manifest));
    expect(createExperimentManifestHash(reorderedManifest)).toBe(
      createExperimentManifestHash(manifest)
    );
  });

  it('평가 계약이 바뀌면 SHA-256도 바뀐다', () => {
    const manifest = createLocalManifest();
    const changedManifest = {
      ...manifest,
      ranking: {
        ...manifest.ranking,
        rrfPrimaryK: 61,
      },
    };

    expect(createExperimentManifestHash(changedManifest)).not.toBe(
      createExperimentManifestHash(manifest)
    );
  });

  it('지원하지 않는 값을 안정 직렬화하지 않는다', () => {
    expect(() => stableStringify({ invalid: undefined })).toThrow(
      /지원하지 않는 값/u
    );
    expect(() => stableStringify({ invalid: Number.NaN })).toThrow(
      /유한한 숫자/u
    );
  });

  it('승인되지 않은 외부 API 실행을 거부한다', () => {
    const manifest = createExternalManifest({
      approved: false,
      approvalReference: 'pending',
      projectionHash: 'c'.repeat(64),
      maxDocuments: 72,
      maxQueries: 45,
    });

    expect(() =>
      assertExternalExecutionApproved(manifest, {
        documentCount: 72,
        queryCount: 45,
        projectionHash: 'c'.repeat(64),
      })
    ).toThrow(/승인/u);
  });

  it('승인된 문서·query 수보다 큰 외부 API 실행을 거부한다', () => {
    const manifest = createExternalManifest({
      approved: true,
      approvalReference: 'user-approved-run-1',
      projectionHash: 'c'.repeat(64),
      maxDocuments: 72,
      maxQueries: 45,
    });

    expect(() =>
      assertExternalExecutionApproved(manifest, {
        documentCount: 73,
        queryCount: 45,
        projectionHash: 'c'.repeat(64),
      })
    ).toThrow(/문서.*72.*73/u);
    expect(() =>
      assertExternalExecutionApproved(manifest, {
        documentCount: 72,
        queryCount: 46,
        projectionHash: 'c'.repeat(64),
      })
    ).toThrow(/query.*45.*46/u);
  });

  it('승인된 projection과 범위 안의 외부 API 실행만 허용한다', () => {
    const manifest = createExternalManifest({
      approved: true,
      approvalReference: 'user-approved-run-1',
      projectionHash: 'c'.repeat(64),
      maxDocuments: 72,
      maxQueries: 45,
    });

    expect(() =>
      assertExternalExecutionApproved(manifest, {
        documentCount: 72,
        queryCount: 45,
        projectionHash: 'c'.repeat(64),
      })
    ).not.toThrow();
    expect(() =>
      assertExternalExecutionApproved(manifest, {
        documentCount: 72,
        queryCount: 45,
        projectionHash: 'd'.repeat(64),
      })
    ).toThrow(/projection/u);
  });
});
