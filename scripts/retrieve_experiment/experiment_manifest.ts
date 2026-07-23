import { createHash } from 'node:crypto';

import type { QueryPhase, QuerySlice } from './contracts';

export type ExperimentProvider = {
  kind: 'local' | 'external';
  name: string;
  modelId: string;
  modelRevision: string;
  embeddingDimension: number;
  documentTaskType: string;
  queryTaskType: string;
};

export type ExternalExecutionApproval = {
  approved: boolean;
  approvalReference: string;
  projectionHash: string;
  maxDocuments: number;
  maxQueries: number;
};

export type ExperimentManifest = {
  schemaVersion: 1;
  dataset: {
    corpusVersion: string;
    querySetVersion: string;
    corpusHash: string;
    querySetHash: string;
  };
  provider: ExperimentProvider;
  cache: {
    namespace: string;
    version: string;
  };
  ranking: {
    resultLimit: number;
    semanticCandidateDepth: number;
    rrfPrimaryK: number;
    rrfSensitivityK: number;
  };
  randomSeed: number;
  queryCounts: Record<QuerySlice, Record<QueryPhase, number>>;
  externalApproval?: ExternalExecutionApproval;
};

export type ExternalExecutionScope = {
  documentCount: number;
  queryCount: number;
  projectionHash: string;
};

const SHA_256_PATTERN = /^[a-f0-9]{64}$/u;
const QUERY_SLICES = ['lexical', 'semantic', 'negative'] as const;
const QUERY_PHASES = ['calibration', 'check'] as const;

export function validateExperimentManifest(
  value: unknown
): asserts value is ExperimentManifest {
  const manifest = requireRecord(value, 'manifest');

  requireExactNumber(manifest.schemaVersion, 1, 'schemaVersion');

  const dataset = requireRecord(manifest.dataset, 'dataset');
  requireNonEmptyString(dataset.corpusVersion, 'dataset.corpusVersion');
  requireNonEmptyString(dataset.querySetVersion, 'dataset.querySetVersion');
  requireSha256(dataset.corpusHash, 'dataset.corpusHash');
  requireSha256(dataset.querySetHash, 'dataset.querySetHash');

  validateProvider(manifest.provider);
  validateCache(manifest.cache);
  validateRanking(manifest.ranking);
  requireNonNegativeInteger(manifest.randomSeed, 'randomSeed');
  validateQueryCounts(manifest.queryCounts);

  if (manifest.externalApproval !== undefined) {
    validateExternalApproval(manifest.externalApproval);
  }
}

export function createExperimentManifestHash(
  manifest: ExperimentManifest
): string {
  validateExperimentManifest(manifest);

  return createHash('sha256').update(stableStringify(manifest)).digest('hex');
}

export function stableStringify(value: unknown): string {
  return serializeStableValue(value, new Set<object>(), '$');
}

export function assertExternalExecutionApproved(
  manifest: ExperimentManifest,
  scope: ExternalExecutionScope
): void {
  validateExperimentManifest(manifest);

  if (manifest.provider.kind !== 'external') {
    return;
  }

  const approval = manifest.externalApproval;

  if (!approval?.approved) {
    throw new Error('외부 API 실행에 대한 사용자 승인이 없습니다.');
  }

  validateExecutionScope(scope);

  if (scope.projectionHash !== approval.projectionHash) {
    throw new Error('승인된 projection과 실행 projection이 다릅니다.');
  }

  if (scope.documentCount > approval.maxDocuments) {
    throw new Error(
      `승인된 문서 수 ${approval.maxDocuments}개보다 실행 문서 수 ${scope.documentCount}개가 큽니다.`
    );
  }

  if (scope.queryCount > approval.maxQueries) {
    throw new Error(
      `승인된 query 수 ${approval.maxQueries}개보다 실행 query 수 ${scope.queryCount}개가 큽니다.`
    );
  }
}

function validateProvider(value: unknown): void {
  const provider = requireRecord(value, 'provider');

  if (provider.kind !== 'local' && provider.kind !== 'external') {
    throw new Error('provider.kind는 local 또는 external이어야 합니다.');
  }

  requireNonEmptyString(provider.name, 'provider.name');
  requireNonEmptyString(provider.modelId, 'provider.modelId');
  requireNonEmptyString(provider.modelRevision, 'provider.modelRevision');
  requirePositiveInteger(
    provider.embeddingDimension,
    'provider.embeddingDimension'
  );
  requireNonEmptyString(provider.documentTaskType, 'provider.documentTaskType');
  requireNonEmptyString(provider.queryTaskType, 'provider.queryTaskType');
}

function validateCache(value: unknown): void {
  const cache = requireRecord(value, 'cache');

  requireNonEmptyString(cache.namespace, 'cache.namespace');
  requireNonEmptyString(cache.version, 'cache.version');
}

function validateRanking(value: unknown): void {
  const ranking = requireRecord(value, 'ranking');

  requirePositiveInteger(ranking.resultLimit, 'ranking.resultLimit');
  requirePositiveInteger(
    ranking.semanticCandidateDepth,
    'ranking.semanticCandidateDepth'
  );
  requirePositiveInteger(ranking.rrfPrimaryK, 'ranking.rrfPrimaryK');
  requirePositiveInteger(ranking.rrfSensitivityK, 'ranking.rrfSensitivityK');
}

function validateQueryCounts(value: unknown): void {
  const queryCounts = requireRecord(value, 'queryCounts');

  for (const slice of QUERY_SLICES) {
    const phaseCounts = requireRecord(
      queryCounts[slice],
      `queryCounts.${slice}`
    );

    for (const phase of QUERY_PHASES) {
      requireNonNegativeInteger(
        phaseCounts[phase],
        `queryCounts.${slice}.${phase}`
      );
    }
  }
}

function validateExternalApproval(value: unknown): void {
  const approval = requireRecord(value, 'externalApproval');

  if (typeof approval.approved !== 'boolean') {
    throw new Error('externalApproval.approved는 boolean이어야 합니다.');
  }

  requireNonEmptyString(
    approval.approvalReference,
    'externalApproval.approvalReference'
  );
  requireSha256(approval.projectionHash, 'externalApproval.projectionHash');
  requireNonNegativeInteger(
    approval.maxDocuments,
    'externalApproval.maxDocuments'
  );
  requireNonNegativeInteger(approval.maxQueries, 'externalApproval.maxQueries');
}

function validateExecutionScope(scope: ExternalExecutionScope): void {
  requireNonNegativeInteger(scope.documentCount, 'documentCount');
  requireNonNegativeInteger(scope.queryCount, 'queryCount');
  requireSha256(scope.projectionHash, 'projectionHash');
}

function serializeStableValue(
  value: unknown,
  ancestors: Set<object>,
  path: string
): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${path}의 숫자는 유한한 숫자여야 합니다.`);
    }

    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return serializeCollection(value, ancestors, path, () => {
      return `[${value
        .map((item, index) =>
          serializeStableValue(item, ancestors, `${path}[${index}]`)
        )
        .join(',')}]`;
    });
  }

  if (isPlainRecord(value)) {
    return serializeCollection(value, ancestors, path, () => {
      const entries = Object.keys(value)
        .sort()
        .map((key) => {
          const serializedValue = serializeStableValue(
            value[key],
            ancestors,
            `${path}.${key}`
          );

          return `${JSON.stringify(key)}:${serializedValue}`;
        });

      return `{${entries.join(',')}}`;
    });
  }

  throw new Error(`${path}에 지원하지 않는 값이 있습니다.`);
}

function serializeCollection(
  value: object,
  ancestors: Set<object>,
  path: string,
  serialize: () => string
): string {
  if (ancestors.has(value)) {
    throw new Error(`${path}에 순환 참조가 있어 직렬화할 수 없습니다.`);
  }

  ancestors.add(value);

  try {
    return serialize();
  } finally {
    ancestors.delete(value);
  }
}

function requireRecord(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new Error(`${fieldName}는 일반 객체여야 합니다.`);
  }

  return value;
}

function requireNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName}는 비어 있지 않은 문자열이어야 합니다.`);
  }
}

function requireSha256(value: unknown, fieldName: string): void {
  if (typeof value !== 'string' || !SHA_256_PATTERN.test(value)) {
    throw new Error(`${fieldName}는 소문자 SHA-256이어야 합니다.`);
  }
}

function requirePositiveInteger(value: unknown, fieldName: string): void {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName}는 양의 정수여야 합니다.`);
  }
}

function requireNonNegativeInteger(value: unknown, fieldName: string): void {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error(`${fieldName}는 0 이상의 정수여야 합니다.`);
  }
}

function requireExactNumber(
  value: unknown,
  expected: number,
  fieldName: string
): void {
  if (value !== expected) {
    throw new Error(`${fieldName}는 ${expected}이어야 합니다.`);
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
