import {
  BROWSER_BENCHMARK_CONFIG,
  calculateNearestRankPercentile,
  validateEmbeddingVector,
} from './contract';
import { measureMemoryAtBoundary, type MemoryMeasurement } from './memory';

const SYNTHETIC_QUERY =
  '여러 명이 함께 쓰는 프로젝트 온보딩 화면을 정리해야 한다';
const WARM_QUERY_COUNT = 20;

type AssetBytes = Readonly<{
  model: number | null;
  other: number | null;
  tokenizer: number | null;
  wasm: number | null;
}>;

type WorkerMessage =
  | Readonly<{ type: 'ready' }>
  | Readonly<{ id: number; type: 'embedding'; vector: number[] }>
  | Readonly<{ type: 'error'; message: string }>
  | Readonly<{
      type: 'progress';
      file: string;
      loaded: number | null;
      total: number;
    }>;

type WorkerDiagnostics = Readonly<{
  errors: readonly string[];
  progress: readonly Readonly<{
    file: string;
    loaded: number | null;
    total: number;
  }>[];
}>;

type WorkerSession = Readonly<{
  assets: () => AssetBytes;
  dispose: () => void;
  query: (text: string) => Promise<readonly number[]>;
  ready: Promise<void>;
}>;

type BenchmarkStage = Readonly<{
  cacheStorageDeltaBytes: number | null;
  firstQueryMs: number;
  loadMs: number;
  memory: Readonly<{
    afterFirst: MemoryMeasurement;
    afterLoad: MemoryMeasurement;
    afterWarm: MemoryMeasurement;
    baseline: MemoryMeasurement;
    peakStageBoundaryEstimateBytes: number | null;
  }>;
  workerAssets: AssetBytes;
  warmQueryMs: readonly number[];
  warmQueryP50Ms: number;
  warmQueryP95Ms: number;
}>;

declare global {
  interface Window {
    browserBenchmark: Readonly<{
      clearTransformersCaches: () => Promise<readonly string[]>;
      getRuntime: () => Readonly<Record<string, unknown>>;
      getWorkerDiagnostics: () => WorkerDiagnostics;
      measure: () => Promise<BenchmarkStage>;
      queryAfterVisibility: () => Promise<readonly number[]>;
      resetVisibilityEvents: () => void;
      startAndCancelWorker: () => Readonly<{ workerTerminated: true }>;
      visibilityEvents: () => readonly string[];
    }>;
  }
}

const visibilityEvents: string[] = [];
let lastWorkerDiagnostics: WorkerDiagnostics = { errors: [], progress: [] };
document.addEventListener('visibilitychange', () => {
  visibilityEvents.push(document.visibilityState);
});

window.browserBenchmark = {
  async clearTransformersCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    return cacheNames;
  },
  getRuntime() {
    return {
      backend: BROWSER_BENCHMARK_CONFIG.backend,
      crossOriginIsolated: crossOriginIsolated,
      deviceMemory:
        typeof (navigator as Navigator & { deviceMemory?: unknown })
          .deviceMemory === 'number'
          ? (navigator as Navigator & { deviceMemory: number }).deviceMemory
          : null,
      hardwareConcurrency: navigator.hardwareConcurrency,
      navigatorGpuSupported: 'gpu' in navigator,
      userAgent: navigator.userAgent,
    };
  },
  getWorkerDiagnostics() {
    return lastWorkerDiagnostics;
  },
  measure,
  async queryAfterVisibility() {
    const session = createWorkerSession();
    try {
      await within(session.ready, 180_000, '복구 pipeline ready');
      return await within(session.query(SYNTHETIC_QUERY), 60_000, '복구 query');
    } finally {
      session.dispose();
    }
  },
  resetVisibilityEvents() {
    visibilityEvents.length = 0;
  },
  startAndCancelWorker() {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.postMessage({ type: 'initialize' });
    worker.terminate();
    return { workerTerminated: true };
  },
  visibilityEvents() {
    return [...visibilityEvents];
  },
};

async function measure(): Promise<BenchmarkStage> {
  const cacheBefore = await estimateCacheBytes();
  const baseline = await measureMemory();
  const session = createWorkerSession();
  const loadStartedAt = performance.now();

  try {
    await within(session.ready, 180_000, 'pipeline ready');
    const loadMs = performance.now() - loadStartedAt;
    const afterLoad = await measureMemory();

    const firstStartedAt = performance.now();
    validateEmbeddingVector(
      await within(session.query(SYNTHETIC_QUERY), 60_000, '첫 query')
    );
    const firstQueryMs = performance.now() - firstStartedAt;
    const afterFirst = await measureMemory();

    const warmQueryMs: number[] = [];
    for (let index = 0; index < WARM_QUERY_COUNT; index += 1) {
      const startedAt = performance.now();
      validateEmbeddingVector(
        await within(session.query(SYNTHETIC_QUERY), 60_000, 'warm query')
      );
      warmQueryMs.push(performance.now() - startedAt);
    }
    const afterWarm = await measureMemory();
    const cacheAfter = await estimateCacheBytes();
    const measurements = [baseline, afterLoad, afterFirst, afterWarm];
    const observedBytes = measurements
      .map(({ bytes }) => bytes)
      .filter((bytes): bytes is number => bytes !== null);

    return {
      cacheStorageDeltaBytes:
        cacheBefore === null || cacheAfter === null
          ? null
          : cacheAfter - cacheBefore,
      firstQueryMs,
      loadMs,
      memory: {
        afterFirst,
        afterLoad,
        afterWarm,
        baseline,
        peakStageBoundaryEstimateBytes:
          observedBytes.length === 0 ? null : Math.max(...observedBytes),
      },
      workerAssets: session.assets(),
      warmQueryMs,
      warmQueryP50Ms: calculateNearestRankPercentile(warmQueryMs, 0.5),
      warmQueryP95Ms: calculateNearestRankPercentile(warmQueryMs, 0.95),
    };
  } finally {
    session.dispose();
  }
}

function createWorkerSession(): WorkerSession {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  });
  const fileTotals = new Map<string, number>();
  const progress: Array<{
    file: string;
    loaded: number | null;
    total: number;
  }> = [];
  const errors: string[] = [];
  lastWorkerDiagnostics = { errors, progress };
  let nextQueryId = 0;
  const pendingQueries = new Map<
    number,
    Readonly<{
      reject: (reason: unknown) => void;
      resolve: (vector: readonly number[]) => void;
    }>
  >();
  let readyResolve: () => void;
  let readyReject: (reason: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });

  worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (message.type === 'progress') {
      const previous = fileTotals.get(message.file) ?? 0;
      fileTotals.set(message.file, Math.max(previous, message.total));
      progress.push({
        file: message.file,
        loaded: message.loaded,
        total: message.total,
      });
      return;
    }
    if (message.type === 'ready') {
      readyResolve();
      return;
    }
    if (message.type === 'error') {
      const error = new Error(message.message);
      errors.push(message.message);
      readyReject(error);
      pendingQueries.forEach(({ reject }) => reject(error));
      pendingQueries.clear();
      return;
    }
    const pending = pendingQueries.get(message.id);
    if (pending !== undefined) {
      pendingQueries.delete(message.id);
      pending.resolve(message.vector);
    }
  });
  worker.addEventListener('error', (event) => {
    const error = new Error(event.message);
    errors.push(event.message);
    readyReject(error);
    pendingQueries.forEach(({ reject }) => reject(error));
    pendingQueries.clear();
  });
  worker.postMessage({ type: 'initialize' });

  return {
    assets: () => summarizeAssets(fileTotals),
    dispose: () => worker.terminate(),
    query: (text) =>
      new Promise<readonly number[]>((resolve, reject) => {
        const id = nextQueryId;
        nextQueryId += 1;
        pendingQueries.set(id, { reject, resolve });
        worker.postMessage({ id, text, type: 'query' });
      }),
    ready,
  };
}

async function estimateCacheBytes(): Promise<number | null> {
  if (navigator.storage?.estimate === undefined) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  return typeof estimate.usage === 'number' ? estimate.usage : null;
}

async function measureMemory(): Promise<MemoryMeasurement> {
  const performanceWithMemory = performance as Performance & {
    measureUserAgentSpecificMemory?: () => Promise<Readonly<{ bytes: number }>>;
    memory?: Readonly<{ totalJSHeapSize?: number }>;
  };
  return await measureMemoryAtBoundary({
    heapBytes: performanceWithMemory.memory?.totalJSHeapSize,
    measureUserAgentSpecificMemory:
      performanceWithMemory.measureUserAgentSpecificMemory,
    timeoutMs: 10_000,
  });
}

function summarizeAssets(fileTotals: ReadonlyMap<string, number>): AssetBytes {
  const totals = { model: 0, other: 0, tokenizer: 0, wasm: 0 };
  fileTotals.forEach((total, file) => {
    if (file.includes('tokenizer')) {
      totals.tokenizer += total;
    } else if (file.includes('.wasm')) {
      totals.wasm += total;
    } else if (file.includes('.onnx')) {
      totals.model += total;
    } else {
      totals.other += total;
    }
  });

  return {
    model: totals.model === 0 ? null : totals.model,
    other: totals.other === 0 ? null : totals.other,
    tokenizer: totals.tokenizer === 0 ? null : totals.tokenizer,
    wasm: totals.wasm === 0 ? null : totals.wasm,
  };
}

function within<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stage: string
): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(
        new Error(`${stage}가 ${timeoutMs / 1000}초 안에 끝나지 않았습니다.`)
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  });
}
