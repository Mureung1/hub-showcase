import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { createServer } from 'vite';

import { BROWSER_BENCHMARK_CONFIG } from './browser_benchmark/contract';
import { verifyFixedModelCacheEntries } from './browser_benchmark/cache_evidence';
import { renderBrowserBenchmarkReport } from './browser_benchmark/report';

const execFileAsync = promisify(execFile);
const BENCHMARK_PORT = 4173;
const DESKTOP_DEBUG_PORT = 9222;
const ANDROID_DEBUG_PORT = 9223;
const ANDROID_SERIAL = 'emulator-5554';
const CHROME_PATH =
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BENCHMARK_PATH = '/';
const BENCHMARK_URL = `http://localhost:${BENCHMARK_PORT}${BENCHMARK_PATH}`;
const SIMPLE_EVALUATION_TIMEOUT_MS = 30_000;
const CANCELLATION_EVALUATION_TIMEOUT_MS = 90_000;
const RECOVERY_QUERY_EVALUATION_TIMEOUT_MS = 300_000;
const MEASURE_EVALUATION_TIMEOUT_MS = 1_800_000;
const RESULT_PATH = resolve(
  'scripts/retrieve_experiment/results/browser_benchmark_result.json'
);
const REPORT_PATH = resolve(
  'scripts/retrieve_experiment/results/browser_benchmark_report.md'
);

type CdpResponse = Readonly<{
  error?: Readonly<{ message: string }>;
  id: number;
  result?: Record<string, unknown>;
}>;

type CdpEvent = Readonly<{
  method: string;
  params?: Record<string, unknown>;
}>;

type CdpPage = Readonly<{
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}>;

type CdpVersion = Readonly<{
  webSocketDebuggerUrl: string;
}>;

type DeviceResult =
  | Readonly<{
      browserVersion: string;
      cancellation: Record<string, unknown>;
      cache: Record<string, unknown>;
      cold: Record<string, unknown>;
      device: 'desktop' | 'android';
      runtime: Record<string, unknown>;
      status: 'measured';
      tabRecovery: Readonly<{
        queryVectorDimensions: number;
        visibilityEvents: readonly string[];
        visibilityTransitionObserved: boolean;
      }>;
    }>
  | Readonly<{
      device: 'desktop' | 'android';
      reason: string;
      status: 'not measured';
    }>;

class CdpConnection {
  private readonly pending = new Map<
    number,
    Readonly<{
      reject: (reason: unknown) => void;
      resolve: (result: Record<string, unknown>) => void;
    }>
  >();
  private nextId = 1;
  private readonly socket: WebSocket;
  private readonly events: CdpEvent[] = [];

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener('message', (event) => {
      const response = JSON.parse(String(event.data)) as CdpResponse & CdpEvent;
      const pending = this.pending.get(response.id);
      if (pending === undefined) {
        if (typeof response.method === 'string') {
          this.events.push({
            method: response.method,
            params: response.params,
          });
        }
        return;
      }
      this.pending.delete(response.id);
      if (response.error !== undefined) {
        pending.reject(new Error(response.error.message));
        return;
      }
      pending.resolve(response.result ?? {});
    });
    socket.addEventListener('close', () => {
      this.pending.forEach(({ reject }) =>
        reject(new Error('CDP 연결이 닫혔습니다.'))
      );
      this.pending.clear();
    });
  }

  static async connect(
    url: string,
    timeoutMs = 10_000
  ): Promise<CdpConnection> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolvePromise, reject) => {
      const timeoutId = setTimeout(
        () =>
          reject(
            new Error(
              `CDP WebSocket 연결이 ${timeoutMs}ms 안에 끝나지 않았습니다.`
            )
          ),
        timeoutMs
      );
      socket.addEventListener(
        'open',
        () => {
          clearTimeout(timeoutId);
          resolvePromise();
        },
        { once: true }
      );
      socket.addEventListener(
        'error',
        () => {
          clearTimeout(timeoutId);
          reject(new Error('CDP WebSocket 연결에 실패했습니다.'));
        },
        {
          once: true,
        }
      );
    });
    return new CdpConnection(socket);
  }

  call(
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs = 30_000
  ): Promise<Record<string, unknown>> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolvePromise, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(
            new Error(`CDP ${method}가 ${timeoutMs}ms 안에 끝나지 않았습니다.`)
          );
        }
      }, timeoutMs);
      this.pending.set(id, {
        reject: (reason) => {
          clearTimeout(timeoutId);
          reject(reason);
        },
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolvePromise(result);
        },
      });
      try {
        this.socket.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  close(): void {
    this.socket.close();
  }

  diagnostics(): readonly CdpEvent[] {
    return [...this.events];
  }

  eventCursor(): number {
    return this.events.length;
  }

  eventsSince(cursor: number): readonly CdpEvent[] {
    return this.events.slice(cursor);
  }
}

async function main(): Promise<void> {
  const vite = await createServer({
    configFile: resolve(
      'scripts/retrieve_experiment/browser_benchmark/vite.config.ts'
    ),
  });
  await vite.listen();

  try {
    const desktop = await runDesktopBenchmark();
    if (process.env.BROWSER_BENCHMARK_DESKTOP_ONLY === '1') {
      await writeResult({
        android: {
          device: 'android',
          reason: '환경 변수로 Android 측정을 생략했습니다.',
          status: 'not measured',
        },
        desktop,
      });
      return;
    }
    const android = await runAndroidBenchmark();
    await writeResult({ android, desktop });
  } finally {
    await vite.close();
  }
}

async function writeResult(platforms: {
  android: DeviceResult;
  desktop: DeviceResult;
}): Promise<void> {
  const result = {
    generatedAt: new Date().toISOString(),
    measurementContract: {
      backend: BROWSER_BENCHMARK_CONFIG.backend,
      cacheLoad:
        'cold 성공 뒤 새 Worker를 만들고 Transformers Cache Storage 적중 상태에서 Worker 생성부터 pipeline ready까지 측정했습니다.',
      coldLoad:
        '같은 origin의 Cache Storage를 삭제하고 HTTP cache를 CDP로 비활성화·초기화한 뒤 Worker 생성부터 pipeline ready까지 측정했습니다.',
      dimensions: BROWSER_BENCHMARK_CONFIG.dimensions,
      memory:
        'peak는 단계 경계의 최대 추정치이며 연속 peak가 아닙니다. 지원 API가 없으면 null과 한계를 기록합니다.',
      model: BROWSER_BENCHMARK_CONFIG.modelId,
      revision: BROWSER_BENCHMARK_CONFIG.revision,
      warmPercentile: '정렬 후 ceil(p*n)-1 nearest-rank',
    },
    platforms,
  };
  await fs.writeFile(
    RESULT_PATH,
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(REPORT_PATH, renderBrowserBenchmarkReport(result), 'utf8');
}

async function runDesktopBenchmark(): Promise<DeviceResult> {
  let chrome: ChildProcess | undefined;
  let profileDirectory: string | undefined;
  let browser: CdpConnection | undefined;
  let page: CdpConnection | undefined;
  try {
    await fs.access(CHROME_PATH);
    profileDirectory = await fs.mkdtemp(
      join(tmpdir(), 'hub-retrieve-browser-benchmark-')
    );
    chrome = spawn(
      CHROME_PATH,
      [
        `--remote-debugging-port=${DESKTOP_DEBUG_PORT}`,
        '--remote-debugging-address=127.0.0.1',
        '--remote-allow-origins=*',
        `--user-data-dir=${profileDirectory}`,
        '--enable-blink-features=ForceEagerMeasureMemory',
        '--no-first-run',
        '--no-default-browser-check',
        BENCHMARK_URL,
      ],
      { windowsHide: true }
    );
    const endpoints = await waitForEndpoints(DESKTOP_DEBUG_PORT, BENCHMARK_URL);
    browser = await CdpConnection.connect(
      endpoints.version.webSocketDebuggerUrl
    );
    page = await CdpConnection.connect(endpoints.page.webSocketDebuggerUrl);
    return await measurePage('desktop', browser, page, endpoints.page.id);
  } catch (error) {
    return notMeasured('desktop', error);
  } finally {
    page?.close();
    browser?.close();
    if (chrome !== undefined) {
      await stopChrome(chrome);
    }
    if (profileDirectory !== undefined) {
      await removeTemporaryProfile(profileDirectory);
    }
  }
}

async function runAndroidBenchmark(): Promise<DeviceResult> {
  let adbPath: string | undefined;
  let browser: CdpConnection | undefined;
  let page: CdpConnection | undefined;
  let reverseCreated = false;
  let forwardCreated = false;
  try {
    adbPath = await resolveAdbPath();
    reverseCreated = await createReverseIfAbsent(adbPath);
    forwardCreated = await createForwardIfAbsent(adbPath);
    await adb(adbPath, [
      '-s',
      ANDROID_SERIAL,
      'shell',
      'am',
      'start',
      '-n',
      'com.android.chrome/com.google.android.apps.chrome.Main',
      '-d',
      BENCHMARK_URL,
    ]);
    const endpoints = await waitForEndpoints(ANDROID_DEBUG_PORT, BENCHMARK_URL);
    browser = await CdpConnection.connect(
      endpoints.version.webSocketDebuggerUrl
    );
    page = await CdpConnection.connect(endpoints.page.webSocketDebuggerUrl);
    return await measurePage('android', browser, page, endpoints.page.id);
  } catch (error) {
    return notMeasured('android', error);
  } finally {
    page?.close();
    browser?.close();
    if (forwardCreated && adbPath !== undefined) {
      await adb(adbPath, [
        '-s',
        ANDROID_SERIAL,
        'forward',
        '--remove',
        `tcp:${ANDROID_DEBUG_PORT}`,
      ]).catch(() => undefined);
    }
    if (reverseCreated && adbPath !== undefined) {
      await adb(adbPath, [
        '-s',
        ANDROID_SERIAL,
        'reverse',
        '--remove',
        `tcp:${BENCHMARK_PORT}`,
      ]).catch(() => undefined);
    }
  }
}

async function measurePage(
  device: 'desktop' | 'android',
  browser: CdpConnection,
  page: CdpConnection,
  pageId: string
): Promise<DeviceResult> {
  try {
    await waitForPageRuntime(page);
    return await measurePageStages(device, browser, page, pageId);
  } catch (error) {
    const workerDiagnostics = await evaluate<Record<string, unknown>>(
      page,
      'window.browserBenchmark?.getWorkerDiagnostics?.() ?? null',
      5000
    ).catch(() => null);
    throw new Error(
      JSON.stringify({
        error: '페이지 측정 단계가 시간 초과되었거나 실행에 실패했습니다.',
        workerDiagnostics: summarizeWorkerDiagnostics(workerDiagnostics),
      }),
      { cause: error }
    );
  }
}

async function waitForPageRuntime(page: CdpConnection): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15_000) {
    try {
      const isReady = await evaluate<boolean>(
        page,
        'typeof window.browserBenchmark !== "undefined"',
        5000
      );
      if (isReady) {
        return;
      }
    } catch {
      // Vite 모듈 변환과 초기 실행이 끝날 때까지 같은 페이지를 다시 확인한다.
    }
    await delay(100);
  }
  throw new Error('15초 안에 브라우저 벤치마크 런타임이 준비되지 않았습니다.');
}

async function measurePageStages(
  device: 'desktop' | 'android',
  browser: CdpConnection,
  page: CdpConnection,
  pageId: string
): Promise<DeviceResult> {
  const version = await browser.call('Browser.getVersion');
  await page.call('Network.enable');
  await page.call('Network.clearBrowserCache');
  await page.call('Network.setCacheDisabled', { cacheDisabled: true });
  await evaluate(page, 'window.browserBenchmark.clearTransformersCaches()');
  const runtime = await evaluate<Record<string, unknown>>(
    page,
    'window.browserBenchmark.getRuntime()'
  );
  const cold = await evaluate<Record<string, unknown>>(
    page,
    'window.browserBenchmark.measure()',
    MEASURE_EVALUATION_TIMEOUT_MS
  );
  const cacheStorageEvidence = await evaluate<Record<string, unknown>>(
    page,
    'window.browserBenchmark.inspectTransformersCache()'
  );
  await page.call('Network.setCacheDisabled', { cacheDisabled: false });
  const cacheEntries = Array.isArray(cacheStorageEvidence.entries)
    ? cacheStorageEvidence.entries.filter(isCacheEntry)
    : [];
  const cacheEntryVerification = verifyFixedModelCacheEntries(cacheEntries);
  if (!cacheEntryVerification.cacheHitVerified) {
    throw new Error(
      '고정 revision 모델 Cache Storage 항목이 준비되지 않았습니다.'
    );
  }
  const cancellation = await evaluate<Record<string, unknown>>(
    page,
    'window.browserBenchmark.startAndCancelWorker()',
    CANCELLATION_EVALUATION_TIMEOUT_MS
  );
  const cacheNetworkCursor = page.eventCursor();
  const cache = await evaluate<Record<string, unknown>>(
    page,
    'window.browserBenchmark.measure()',
    MEASURE_EVALUATION_TIMEOUT_MS
  );
  const cacheRemoteModelRequestCount = countRemoteModelRequests(
    page.eventsSince(cacheNetworkCursor)
  );
  const cacheEvidence = {
    ...cacheEntryVerification,
    cacheRunRemoteModelRequestCount: cacheRemoteModelRequestCount,
    cacheStorage: cacheStorageEvidence,
    cacheHitVerified:
      cacheEntryVerification.cacheHitVerified &&
      cacheRemoteModelRequestCount === 0,
  };
  if (!cacheEvidence.cacheHitVerified) {
    throw new Error('cache 단계의 모델 캐시 증명을 확인하지 못했습니다.');
  }

  await evaluate(page, 'window.browserBenchmark.resetVisibilityEvents()');
  const background = await browser.call('Target.createTarget', {
    url: 'about:blank',
  });
  const backgroundTargetId = String(background.targetId);
  let visibilityEvents: readonly string[];
  let recoveryVector: readonly number[];
  try {
    await delay(2100);
    await browser.call('Target.activateTarget', { targetId: pageId });
    await delay(500);
    visibilityEvents = await evaluate<readonly string[]>(
      page,
      'window.browserBenchmark.visibilityEvents()'
    );
    recoveryVector = await evaluate<readonly number[]>(
      page,
      'window.browserBenchmark.queryAfterVisibility()',
      RECOVERY_QUERY_EVALUATION_TIMEOUT_MS
    );
  } finally {
    await browser
      .call('Target.closeTarget', { targetId: backgroundTargetId })
      .catch(() => undefined);
  }

  return {
    browserVersion: String(version.product ?? version.revision ?? '관측 불가'),
    cache: { ...cache, cacheEvidence },
    cancellation: {
      ...cancellation,
      cacheReady: cacheEntryVerification.cacheHitVerified,
      recoveryCacheBenchmark: {
        firstQueryMs: cache.firstQueryMs,
        loadMs: cache.loadMs,
        warmQueryCount: Array.isArray(cache.warmQueryMs)
          ? cache.warmQueryMs.length
          : null,
      },
    },
    cold,
    device,
    runtime: {
      ...runtime,
      launchFlags:
        device === 'desktop'
          ? ['--enable-blink-features=ForceEagerMeasureMemory']
          : [],
    },
    status: 'measured',
    tabRecovery: {
      queryVectorDimensions: recoveryVector.length,
      visibilityEvents,
      visibilityTransitionObserved:
        visibilityEvents.includes('hidden') &&
        visibilityEvents.includes('visible'),
    },
  };
}

async function evaluate<T>(
  page: CdpConnection,
  expression: string,
  timeoutMs = SIMPLE_EVALUATION_TIMEOUT_MS
): Promise<T> {
  const response = await page.call(
    'Runtime.evaluate',
    {
      awaitPromise: true,
      expression,
      returnByValue: true,
    },
    timeoutMs
  );
  if (response.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(response.exceptionDetails));
  }
  const result = response.result as Readonly<{ value?: T }>;
  return result.value as T;
}

async function waitForEndpoints(
  port: number,
  expectedUrl: string
): Promise<Readonly<{ page: CdpPage; version: CdpVersion }>> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    try {
      const [versionResponse, pagesResponse] = await Promise.all([
        fetch(`http://127.0.0.1:${port}/json/version`, {
          signal: AbortSignal.timeout(5000),
        }),
        fetch(`http://127.0.0.1:${port}/json/list`, {
          signal: AbortSignal.timeout(5000),
        }),
      ]);
      if (versionResponse.ok && pagesResponse.ok) {
        const version = (await versionResponse.json()) as CdpVersion;
        const pages = (await pagesResponse.json()) as CdpPage[];
        const page = pages.find(
          (candidate) =>
            candidate.type === 'page' && candidate.url.startsWith(expectedUrl)
        );
        if (page !== undefined && version.webSocketDebuggerUrl !== undefined) {
          return { page, version };
        }
      }
    } catch {
      // CDP가 열릴 때까지 재시도한다. 오류 전문에는 환경 정보를 남기지 않는다.
    }
    await delay(250);
  }
  throw new Error('30초 안에 대상 Chrome의 DevTools 페이지를 찾지 못했습니다.');
}

async function resolveAdbPath(): Promise<string> {
  const executable = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const sdkRoots = [process.env.ANDROID_SDK_ROOT, process.env.ANDROID_HOME];
  for (const sdkRoot of sdkRoots) {
    if (sdkRoot === undefined || sdkRoot === '') {
      continue;
    }
    const candidate = join(sdkRoot, 'platform-tools', executable);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // 다음 Android SDK 환경 변수 또는 PATH를 확인한다.
    }
  }
  return executable;
}

async function adb(adbPath: string, args: readonly string[]): Promise<void> {
  await adbOutput(adbPath, args);
}

async function adbOutput(
  adbPath: string,
  args: readonly string[]
): Promise<string> {
  const { stdout } = await execFileAsync(adbPath, [...args], {
    timeout: 15_000,
    windowsHide: true,
  }).catch((error) => {
    throw new Error(`ADB ${args.join(' ')} 실행 실패`, { cause: error });
  });
  return stdout;
}

async function createReverseIfAbsent(adbPath: string): Promise<boolean> {
  const local = `tcp:${BENCHMARK_PORT}`;
  const mappings = await adbOutput(adbPath, [
    '-s',
    ANDROID_SERIAL,
    'reverse',
    '--list',
  ]);
  const existing = mappings
    .split(/\r?\n/u)
    .find((line) => line.split(/\s+/u).at(-2) === local);
  if (existing !== undefined) {
    if (existing.split(/\s+/u).at(-1) === local) {
      return false;
    }
    throw new Error(`기존 ADB reverse 매핑이 ${local} 포트를 사용합니다.`);
  }
  await adb(adbPath, ['-s', ANDROID_SERIAL, 'reverse', local, local]);
  return true;
}

async function createForwardIfAbsent(adbPath: string): Promise<boolean> {
  const local = `tcp:${ANDROID_DEBUG_PORT}`;
  const remote = 'localabstract:chrome_devtools_remote';
  const mappings = await adbOutput(adbPath, [
    '-s',
    ANDROID_SERIAL,
    'forward',
    '--list',
  ]);
  const existing = mappings
    .split(/\r?\n/u)
    .find((line) => line.split(/\s+/u).at(-2) === local);
  if (existing !== undefined) {
    if (existing.split(/\s+/u).at(-1) === remote) {
      return false;
    }
    throw new Error(`기존 ADB forward 매핑이 ${local} 포트를 사용합니다.`);
  }
  await adb(adbPath, ['-s', ANDROID_SERIAL, 'forward', local, remote]);
  return true;
}

function isCacheEntry(
  value: unknown
): value is { basename: string; hasFixedRevision: boolean } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { basename?: unknown }).basename === 'string' &&
    typeof (value as { hasFixedRevision?: unknown }).hasFixedRevision ===
      'boolean'
  );
}

function summarizeWorkerDiagnostics(
  value: Record<string, unknown> | null
): Readonly<Record<string, unknown>> | null {
  if (value === null) {
    return null;
  }
  return {
    lastProgressFile:
      typeof value.lastProgressFile === 'string'
        ? value.lastProgressFile
        : null,
    progressEventCount:
      typeof value.progressEventCount === 'number'
        ? value.progressEventCount
        : null,
    stage: typeof value.stage === 'string' ? value.stage : 'unknown',
  };
}

function countRemoteModelRequests(events: readonly CdpEvent[]): number {
  return events.filter(({ method, params }) => {
    if (method !== 'Network.requestWillBeSent') {
      return false;
    }
    const request = params?.request as Readonly<{ url?: unknown }> | undefined;
    return isFixedModelRequest(request?.url);
  }).length;
}

function isFixedModelRequest(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const url = new URL(value);
    const filename = url.pathname.split('/').at(-1);
    return (
      url.hostname.endsWith('huggingface.co') &&
      url.pathname.includes(BROWSER_BENCHMARK_CONFIG.modelId) &&
      url.pathname.includes(BROWSER_BENCHMARK_CONFIG.revision) &&
      (filename === 'config.json' ||
        filename === 'tokenizer.json' ||
        filename === 'tokenizer_config.json' ||
        filename === 'model_quantized.onnx')
    );
  } catch {
    return false;
  }
}

function notMeasured(
  device: 'desktop' | 'android',
  error: unknown
): DeviceResult {
  return {
    device,
    reason: error instanceof Error ? error.message : '알 수 없는 실행 오류',
    status: 'not measured',
  };
}

async function stopChrome(chrome: ChildProcess): Promise<void> {
  if (chrome.pid === undefined) {
    return;
  }
  chrome.kill();
  const terminated = await Promise.race([
    new Promise<boolean>((resolvePromise) => {
      chrome.once('exit', () => resolvePromise(true));
    }),
    delay(5000).then(() => false),
  ]);
  if (!terminated) {
    await execFileAsync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], {
      timeout: 5000,
      windowsHide: true,
    }).catch(() => undefined);
  }
}

async function removeTemporaryProfile(directory: string): Promise<void> {
  const resolvedDirectory = resolve(directory);
  const temporaryRoot = resolve(tmpdir());
  if (
    !resolvedDirectory.startsWith(
      `${temporaryRoot}\\hub-retrieve-browser-benchmark-`
    )
  ) {
    throw new Error('임시 Chrome 프로필 삭제 대상 검증에 실패했습니다.');
  }
  await fs.rm(resolvedDirectory, {
    force: true,
    recursive: true,
    retryDelay: 200,
    maxRetries: 5,
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds)
  );
}

await main();
