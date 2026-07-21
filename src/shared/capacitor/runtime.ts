import { Capacitor } from '@capacitor/core';

export type ApiOriginEnv = Readonly<Record<string, unknown>>;

export type CapacitorRuntime = {
  getPlatform(): string;
  isNativePlatform(): boolean;
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

function requireApiOrigin(source: ApiOriginEnv) {
  const value = source.VITE_CAPACITOR_API_ORIGIN;

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Capacitor API 원점 설정이 필요합니다.');
  }

  return value.trim();
}

function parseOrigin(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Capacitor API 원점은 올바른 URL이어야 합니다.');
  }

  const isLocalHttp =
    url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname.toLowerCase());

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('Capacitor 운영 API 원점은 HTTPS를 사용해야 합니다.');
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Capacitor API 설정은 경로가 없는 원점이어야 합니다.');
  }

  return url.origin;
}

export function isNativeAndroid(runtime: CapacitorRuntime) {
  return runtime.isNativePlatform() && runtime.getPlatform() === 'android';
}

export function parseApiOrigin(source: ApiOriginEnv) {
  return parseOrigin(requireApiOrigin(source));
}

export function validateOptionalApiOrigin(source: ApiOriginEnv) {
  if (source.VITE_CAPACITOR_API_ORIGIN === undefined) {
    return undefined;
  }

  return parseApiOrigin(source);
}

export function getInsightApiOrigin(
  source: ApiOriginEnv = import.meta.env,
  runtime: CapacitorRuntime = Capacitor
) {
  return isNativeAndroid(runtime) ? parseApiOrigin(source) : '';
}
