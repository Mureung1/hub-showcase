export const BROWSER_BENCHMARK_CONFIG = {
  backend: 'wasm',
  dimensions: 384,
  dtype: 'q8',
  modelId: 'Xenova/multilingual-e5-small',
  revision: '761b726dd34fb83930e26aab4e9ac3899aa1fa78',
} as const;

export type BrowserBenchmarkConfig = Readonly<{
  backend: string;
  dimensions: number;
  dtype: string;
  modelId: string;
  revision: string;
}>;

export type BrowserWorkerRequest =
  | Readonly<{ type: 'initialize' }>
  | Readonly<{ type: 'query'; id: number; text: string }>;

export type BrowserWorkerErrorResponse = Readonly<{
  type: 'error';
  id?: number;
  message: string;
}>;

export function createWorkerErrorResponse(
  request: BrowserWorkerRequest,
  error: unknown
): BrowserWorkerErrorResponse {
  return {
    type: 'error',
    ...(request.type === 'query' ? { id: request.id } : {}),
    message: error instanceof Error ? error.message : '알 수 없는 Worker 오류',
  };
}

export function calculateNearestRankPercentile(
  samples: readonly number[],
  percentile: number
): number {
  if (samples.length === 0) {
    throw new Error('분위수 표본은 비어 있을 수 없습니다.');
  }

  if (percentile <= 0 || percentile > 1) {
    throw new Error('분위수는 0보다 크고 1 이하여야 합니다.');
  }

  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.ceil(percentile * sorted.length) - 1;

  return sorted[index];
}

export function validateEmbeddingVector(
  vector: readonly number[]
): readonly number[] {
  if (vector.length !== BROWSER_BENCHMARK_CONFIG.dimensions) {
    throw new Error('임베딩은 384차원이어야 합니다.');
  }

  if (!vector.every(Number.isFinite)) {
    throw new Error('임베딩은 유한한 숫자만 포함해야 합니다.');
  }

  return vector;
}

export function assertBrowserBenchmarkConfig(
  config: BrowserBenchmarkConfig
): void {
  if (config.backend !== BROWSER_BENCHMARK_CONFIG.backend) {
    throw new Error('브라우저 벤치마크는 WASM backend만 허용합니다.');
  }

  if (config.modelId !== BROWSER_BENCHMARK_CONFIG.modelId) {
    throw new Error('고정 모델만 실행할 수 있습니다.');
  }

  if (config.revision !== BROWSER_BENCHMARK_CONFIG.revision) {
    throw new Error('고정 리비전만 실행할 수 있습니다.');
  }

  if (config.dtype !== BROWSER_BENCHMARK_CONFIG.dtype) {
    throw new Error('q8 가중치만 실행할 수 있습니다.');
  }

  if (config.dimensions !== BROWSER_BENCHMARK_CONFIG.dimensions) {
    throw new Error('384차원 임베딩만 실행할 수 있습니다.');
  }
}
