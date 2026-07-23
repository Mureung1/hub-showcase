import { posix, win32 } from 'node:path';

export type CdpMessage = Readonly<{
  error?: Readonly<{ message: string }>;
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
}>;

export function parseCdpMessage(value: unknown): CdpMessage | null {
  try {
    const parsed = JSON.parse(String(value)) as unknown;

    return typeof parsed === 'object' && parsed !== null
      ? (parsed as CdpMessage)
      : null;
  } catch {
    return null;
  }
}

export function resolveChromeExecutablePath(
  platform: NodeJS.Platform,
  override?: string
): string {
  if (override !== undefined && override.trim() !== '') {
    return override;
  }

  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }

  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }

  return '/usr/bin/google-chrome';
}

export function assertTemporaryProfileDirectory(
  directory: string,
  temporaryRoot: string,
  platform: NodeJS.Platform = process.platform
): void {
  const path = platform === 'win32' ? win32 : posix;
  const resolvedDirectory = path.resolve(directory);
  const resolvedTemporaryRoot = path.resolve(temporaryRoot);
  const relativeDirectory = path.relative(
    resolvedTemporaryRoot,
    resolvedDirectory
  );
  const isDirectChild =
    relativeDirectory !== '' &&
    !relativeDirectory.startsWith(`..${path.sep}`) &&
    relativeDirectory !== '..' &&
    !path.isAbsolute(relativeDirectory) &&
    !relativeDirectory.includes(path.sep);

  if (
    !isDirectChild ||
    !relativeDirectory.startsWith('hub-retrieve-browser-benchmark-')
  ) {
    throw new Error('임시 Chrome 프로필 삭제 대상 검증에 실패했습니다.');
  }
}

export async function runCancellationThenCacheBenchmark<
  TCancellation,
  TCache,
>(operations: {
  cancelWorker: () => Promise<TCancellation>;
  measureCache: () => Promise<TCache>;
}): Promise<Readonly<{ cancellation: TCancellation; cache: TCache }>> {
  const cancellation = await operations.cancelWorker();
  const cache = await operations.measureCache();

  return { cache, cancellation };
}

export function assertCacheHitVerified(evidence: {
  cacheHitVerified: boolean;
}): void {
  if (!evidence.cacheHitVerified) {
    throw new Error('cache 단계의 모델 캐시 증명을 확인하지 못했습니다.');
  }
}
