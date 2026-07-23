import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type EmbeddingTaskType = 'query' | 'passage';

export type EmbeddingRequest = Readonly<{
  text: string;
  taskType: EmbeddingTaskType;
}>;

export type EmbeddingProvider = Readonly<{
  providerId: string;
  modelId: string;
  modelRevision: string;
  dimensions: number;
  embed(request: EmbeddingRequest): Promise<readonly number[]>;
}>;

export type EmbeddingCache = Readonly<{
  get(key: string): Promise<readonly number[] | null>;
  set(key: string, vector: readonly number[]): Promise<void>;
}>;

export type EmbeddingCacheKeyInput = Readonly<{
  providerId: string;
  modelId: string;
  modelRevision: string;
  taskType: EmbeddingTaskType;
  text: string;
}>;

export function normalizeEmbeddingInput(text: string): string {
  if (typeof text !== 'string') {
    throw new Error('임베딩 입력은 문자열이어야 합니다.');
  }

  const normalized = text.normalize('NFC').trim().replace(/\s+/gu, ' ');

  if (normalized.length === 0) {
    throw new Error('임베딩 입력은 비어 있을 수 없습니다.');
  }

  return normalized;
}

export function createEmbeddingCacheKey(input: EmbeddingCacheKeyInput): string {
  const identity = [
    assertNonEmptyString(input.providerId, '임베딩 제공자 ID'),
    assertNonEmptyString(input.modelId, '임베딩 모델 ID'),
    assertNonEmptyString(input.modelRevision, '임베딩 모델 리비전'),
    input.taskType,
    normalizeEmbeddingInput(input.text),
  ];

  return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

export function validateEmbeddingVector(
  vector: readonly number[],
  expectedDimensions: number
): number[] {
  if (!Number.isSafeInteger(expectedDimensions) || expectedDimensions <= 0) {
    throw new Error(
      `기대 임베딩 차원은 양의 정수여야 합니다: ${expectedDimensions}`
    );
  }

  if (vector.length !== expectedDimensions) {
    throw new Error(
      `임베딩 벡터 차원은 ${expectedDimensions}이어야 하지만 ${vector.length}입니다.`
    );
  }

  const copiedVector = Array.from(vector);

  if (!copiedVector.every(Number.isFinite)) {
    throw new Error('임베딩 벡터는 유한한 숫자로만 구성되어야 합니다.');
  }

  return copiedVector;
}

export function createFileEmbeddingCache(
  cacheDirectory: string
): EmbeddingCache {
  assertNonEmptyString(cacheDirectory, '임베딩 캐시 경로');

  return {
    async get(key) {
      const path = createCacheFilePath(cacheDirectory, key);

      try {
        const serialized = await readFile(path, 'utf8');
        const parsed: unknown = JSON.parse(serialized);

        if (
          !Array.isArray(parsed) ||
          !parsed.every((value) => typeof value === 'number')
        ) {
          throw new Error(`임베딩 캐시 파일 형식이 잘못되었습니다: ${path}`);
        }

        return parsed;
      } catch (error) {
        if (hasNodeErrorCode(error, 'ENOENT')) {
          return null;
        }

        throw error;
      }
    },
    async set(key, vector) {
      const path = createCacheFilePath(cacheDirectory, key);
      const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;

      await mkdir(cacheDirectory, { recursive: true });

      try {
        await writeFile(temporaryPath, JSON.stringify(vector), 'utf8');
        await rename(temporaryPath, path);
      } finally {
        await unlink(temporaryPath).catch((error: unknown) => {
          if (!hasNodeErrorCode(error, 'ENOENT')) {
            throw error;
          }
        });
      }
    },
  };
}

export async function embedWithCache(options: {
  provider: EmbeddingProvider;
  cache: EmbeddingCache;
  request: EmbeddingRequest;
}): Promise<readonly number[]> {
  const normalizedRequest = {
    ...options.request,
    text: normalizeEmbeddingInput(options.request.text),
  };
  const cacheKey = createEmbeddingCacheKey({
    providerId: options.provider.providerId,
    modelId: options.provider.modelId,
    modelRevision: options.provider.modelRevision,
    taskType: normalizedRequest.taskType,
    text: normalizedRequest.text,
  });
  const cached = await options.cache.get(cacheKey);

  if (cached !== null) {
    return validateEmbeddingVector(cached, options.provider.dimensions);
  }

  const vector = validateEmbeddingVector(
    await options.provider.embed(normalizedRequest),
    options.provider.dimensions
  );

  await options.cache.set(cacheKey, vector);

  return vector;
}

function createCacheFilePath(cacheDirectory: string, key: string): string {
  if (!/^[a-f0-9]{64}$/u.test(key)) {
    throw new Error(`임베딩 캐시 키 형식이 잘못되었습니다: ${key}`);
  }

  return join(cacheDirectory, `${key}.json`);
}

function assertNonEmptyString(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName}은 비어 있지 않은 문자열이어야 합니다.`);
  }

  return value;
}

function hasNodeErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}
