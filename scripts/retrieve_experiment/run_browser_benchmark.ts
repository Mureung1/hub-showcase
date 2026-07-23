import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { createServer } from 'vite';

import { BROWSER_BENCHMARK_CONFIG } from './browser_benchmark/contract';
import { renderBrowserBenchmarkReport } from './browser_benchmark/report';

const execFileAsync = promisify(execFile);
const BENCHMARK_PORT = 4173;
const DESKTOP_DEBUG_PORT = 9222;
const ANDROID_DEBUG_PORT = 9223;
const ANDROID_SERIAL = 'emulator-5554';
const CHROME_PATH =
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADB_PATH =
  'C:\\Users\\cjh51\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const BENCHMARK_PATH = '/';
const BENCHMARK_URL = `http://localhost:${BENCHMARK_PORT}${BENCHMARK_PATH}`;
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
      cancellation: Readonly<{ workerTerminated: true }>;
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

  static async connect(url: string): Promise<CdpConnection> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolvePromise, reject) => {
      socket.addEventListener('open', () => resolvePromise(), { once: true });
      socket.addEventListener(
        'error',
        () => reject(new Error('CDP 연결에 실패했습니다.')),
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
    await writeResult({
      android: {
        device: 'android',
        reason: 'Desktop 측정 완료 뒤 실행 예정',
        status: 'not measured',
      },
      desktop,
    });
    if (process.env.BROWSER_BENCHMARK_DESKTOP_ONLY === '1') {
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
  await fs.writeFile(REPORT_PATH, `${renderReport(result)}\n`, 'utf8');
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
  let browser: CdpConnection | undefined;
  let page: CdpConnection | undefined;
  try {
    await fs.access(ADB_PATH);
    await adb([
      '-s',
      ANDROID_SERIAL,
      'reverse',
      `tcp:${BENCHMARK_PORT}`,
      `tcp:${BENCHMARK_PORT}`,
    ]);
    await adb([
      '-s',
      ANDROID_SERIAL,
      'forward',
      '--remove',
      `tcp:${ANDROID_DEBUG_PORT}`,
    ]).catch(() => undefined);
    await adb([
      '-s',
      ANDROID_SERIAL,
      'forward',
      `tcp:${ANDROID_DEBUG_PORT}`,
      'localabstract:chrome_devtools_remote',
    ]);
    await adb([
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
    const networkEvents = page
      .diagnostics()
      .filter(({ method }) => method === 'Network.loadingFailed')
      .map(({ params }) => params ?? {});
    throw new Error(
      JSON.stringify({
        error: error instanceof Error ? error.message : '알 수 없는 측정 오류',
        networkEvents,
        workerDiagnostics,
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
    'window.browserBenchmark.measure()'
  );
  await page.call('Network.setCacheDisabled', { cacheDisabled: false });
  const cancellation = await evaluate<Readonly<{ workerTerminated: true }>>(
    page,
    'window.browserBenchmark.startAndCancelWorker()'
  );
  const cache = await evaluate<Record<string, unknown>>(
    page,
    'window.browserBenchmark.measure()'
  );

  await evaluate(page, 'window.browserBenchmark.resetVisibilityEvents()');
  const background = await browser.call('Target.createTarget', {
    url: 'about:blank',
  });
  await delay(2100);
  await browser.call('Target.activateTarget', { targetId: pageId });
  await delay(500);
  const visibilityEvents = await evaluate<readonly string[]>(
    page,
    'window.browserBenchmark.visibilityEvents()'
  );
  const recoveryVector = await evaluate<readonly number[]>(
    page,
    'window.browserBenchmark.queryAfterVisibility()'
  );
  const backgroundTargetId = String(background.targetId);
  await browser.call('Target.closeTarget', { targetId: backgroundTargetId });

  return {
    browserVersion: String(version.product ?? version.revision ?? '관측 불가'),
    cache,
    cancellation,
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
  timeoutMs = 240_000
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
        fetch(`http://127.0.0.1:${port}/json/version`),
        fetch(`http://127.0.0.1:${port}/json/list`),
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

async function adb(args: readonly string[]): Promise<void> {
  await execFileAsync(ADB_PATH, [...args], { windowsHide: true });
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

function renderReport(
  result: Readonly<{
    platforms: { android: DeviceResult; desktop: DeviceResult };
  }>
): string {
  const base = renderBrowserBenchmarkReport({
    android: toReportDevice(result.platforms.android),
    desktop: toReportDevice(result.platforms.desktop),
  });
  return [
    base,
    '## 방법과 한계',
    '',
    '- Worker 생성부터 `pipeline` ready까지에는 Worker 모듈, ONNX WASM, 모델·tokenizer fetch 및 초기화가 포함됩니다.',
    '- 자산 크기는 Transformers.js `progress_callback`의 파일별 최대 `total`만 사용했습니다. 관측되지 않은 분류는 `null`이며 Node 파일 크기로 대체하지 않았습니다.',
    '- cold 전 Cache Storage를 삭제했고 HTTP cache를 CDP로 비활성화·초기화했습니다. cache load는 cold 성공 뒤 새 Worker에서 측정했습니다.',
    '- warm p50/p95는 고정 합성 query 20회의 nearest-rank입니다. 모든 query 출력은 384차원·유한값을 검증했습니다.',
    '- 메모리 peak는 지원 API의 단계 경계 최대 추정치일 뿐 연속 peak가 아닙니다.',
    '- WebGPU 지원 여부와 실제 실행 backend는 별도로 기록하며 실제 backend는 고정 WASM입니다.',
    '',
    '## 상세 관측값',
    '',
    '기계 판독용 전체 값은 `browser_benchmark_result.json`에도 같은 UTF-8 JSON으로 보존합니다.',
    '',
    '```json',
    JSON.stringify(result.platforms, null, 2),
    '```',
  ].join('\n');
}

function toReportDevice(device: DeviceResult) {
  if (device.status === 'not measured') {
    return { reason: device.reason, status: 'not measured' as const };
  }
  return {
    coldLoadMs: Number(device.cold.loadMs),
    status: 'measured' as const,
  };
}

await main();
