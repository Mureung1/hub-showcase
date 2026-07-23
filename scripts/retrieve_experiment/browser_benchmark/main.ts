import {
  BROWSER_BENCHMARK_CONFIG,
  calculateNearestRankPercentile,
  validateEmbeddingVector,
} from './contract';
import {
  REQUIRED_MODEL_CACHE_BASENAMES,
  type SanitizedCacheEntry,
} from './cache_evidence';
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
  | Readonly<{ type: 'error' }>
  | Readonly<{
      type: 'progress';
      file: string;
      loaded: number | null;
      total: number;
    }>;

type WorkerDiagnostics = Readonly<{
  lastProgressFile: string | null;
  progressEventCount: number;
  stage: string;
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
      inspectTransformersCache: () => Promise<CacheStorageEvidence>;
      measure: () => Promise<BenchmarkStage>;
      queryAfterVisibility: () => Promise<readonly number[]>;
      resetVisibilityEvents: () => void;
      startAndCancelWorker: () => Promise<CancellationObservation>;
      visibilityEvents: () => readonly string[];
    }>;
  }
}

const visibilityEvents: string[] = [];
let lastWorkerDiagnostics: WorkerDiagnostics = {
  lastProgressFile: null,
  progressEventCount: 0,
  stage: 'idle',
};
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
  inspectTransformersCache,
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
  async startAndCancelWorker() {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });
    return await new Promise<CancellationObservation>((resolve, reject) => {
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        worker.terminate();
        settle(() =>
          reject(
            new Error(
              '취소 Worker의 첫 진행 신호를 기다리다 시간 초과되었습니다.'
            )
          )
        );
      }, 60_000);
      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        callback();
      };
      worker.addEventListener(
        'message',
        (event: MessageEvent<WorkerMessage>) => {
          const message = event.data;
          if (message.type === 'progress') {
            worker.terminate();
            settle(() =>
              resolve({
                firstProgressFile: message.file,
                signal: 'first-progress-callback',
                terminatedAfterFirstProgress: true,
              })
            );
            return;
          }
          if (message.type === 'error') {
            worker.terminate();
            settle(() =>
              reject(new Error('취소 Worker 초기화에 실패했습니다.'))
            );
          }
        }
      );
      worker.addEventListener('error', () => {
        worker.terminate();
        settle(() => reject(new Error('취소 Worker 실행에 실패했습니다.')));
      });
      try {
        worker.postMessage({ type: 'initialize' });
      } catch {
        worker.terminate();
        settle(() => reject(new Error('취소 Worker 시작에 실패했습니다.')));
      }
    });
  },
  visibilityEvents() {
    return [...visibilityEvents];
  },
};

type CancellationObservation = Readonly<{
  firstProgressFile: string;
  signal: 'first-progress-callback';
  terminatedAfterFirstProgress: true;
}>;

type CacheEntryObservation = Readonly<
  SanitizedCacheEntry & {
    sizeBytes: number | null;
  }
>;

type CacheStorageEvidence = Readonly<{
  cacheNames: readonly string[];
  entries: readonly CacheEntryObservation[];
  wasm: Readonly<{
    attemptedMethods: readonly string[];
    limitation: string | null;
    sizeBytes: number | null;
  }>;
}>;

async function measure(): Promise<BenchmarkStage> {
  const cacheBefore = await estimateCacheBytes();
  const baseline = await measureMemory();
  const loadStartedAt = performance.now();
  const session = createWorkerSession();

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
  let progressEventCount = 0;
  let lastProgressFile: string | null = null;
  let stage = 'initializing';
  const updateDiagnostics = () => {
    lastWorkerDiagnostics = { lastProgressFile, progressEventCount, stage };
  };
  updateDiagnostics();
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
      progressEventCount += 1;
      lastProgressFile = message.file;
      updateDiagnostics();
      return;
    }
    if (message.type === 'ready') {
      stage = 'ready';
      updateDiagnostics();
      readyResolve();
      return;
    }
    if (message.type === 'error') {
      stage = 'worker-error';
      updateDiagnostics();
      const error = new Error('Worker 실행에 실패했습니다.');
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
  worker.addEventListener('error', () => {
    stage = 'worker-error';
    updateDiagnostics();
    const error = new Error('Worker 실행에 실패했습니다.');
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
        stage = 'querying';
        updateDiagnostics();
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

async function inspectTransformersCache(): Promise<CacheStorageEvidence> {
  const cacheNames = await caches.keys();
  const entries: CacheEntryObservation[] = [];
  const wasmEntries: CacheEntryObservation[] = [];

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    for (const request of await cache.keys()) {
      const parsed = new URL(request.url);
      const basename = parsed.pathname.split('/').at(-1);
      if (basename === undefined) {
        continue;
      }
      const isRequired = REQUIRED_MODEL_CACHE_BASENAMES.includes(
        basename as (typeof REQUIRED_MODEL_CACHE_BASENAMES)[number]
      );
      const isWasm = basename.endsWith('.wasm');
      if (!isRequired && !isWasm) {
        continue;
      }
      const response = await cache.match(request);
      const contentLength = response?.headers.get('content-length');
      const observation = {
        basename,
        hasFixedRevision: parsed.pathname.includes(
          BROWSER_BENCHMARK_CONFIG.revision
        ),
        sizeBytes:
          contentLength === null || contentLength === undefined
            ? null
            : Number(contentLength),
      };
      if (isWasm) {
        wasmEntries.push(observation);
      } else {
        entries.push(observation);
      }
    }
  }

  return {
    cacheNames,
    entries,
    wasm: {
      attemptedMethods: ['Cache Storage response content-length'],
      limitation:
        wasmEntries.length === 0
          ? 'Transformers Cache Storage에서 ONNX WASM entry를 찾지 못했습니다.'
          : wasmEntries.some(({ sizeBytes }) => sizeBytes === null)
            ? 'ONNX WASM Cache Storage entry는 찾았지만 content-length를 관측하지 못했습니다.'
            : null,
      sizeBytes:
        wasmEntries.find(({ sizeBytes }) => sizeBytes !== null)?.sizeBytes ??
        null,
    },
  };
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
    measureUserAgentSpecificMemoryReceiver: performanceWithMemory,
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
