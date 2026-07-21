import { parseSupabaseEnv } from '../../../src/shared/config';

const LOCAL_EXTENSION_ENV = {
  VITE_EXTENSION_API_ORIGIN: 'http://localhost:3001',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local-development',
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
} as const;

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

type EnvSource = Readonly<Record<string, unknown>>;

export type ExtensionEnv = {
  apiOrigin: string;
  publishableKey: string;
  supabaseUrl: string;
};

export function parseExtensionEnv(source: EnvSource): ExtensionEnv {
  const values = {
    VITE_EXTENSION_API_ORIGIN:
      source.VITE_EXTENSION_API_ORIGIN ??
      LOCAL_EXTENSION_ENV.VITE_EXTENSION_API_ORIGIN,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      source.VITE_SUPABASE_PUBLISHABLE_KEY ??
      LOCAL_EXTENSION_ENV.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_URL:
      source.VITE_SUPABASE_URL ?? LOCAL_EXTENSION_ENV.VITE_SUPABASE_URL,
  };
  const supabase = parseSupabaseEnv(values);

  return {
    apiOrigin: parseOrigin(values.VITE_EXTENSION_API_ORIGIN, 'API'),
    publishableKey: supabase.publishableKey,
    supabaseUrl: new URL(supabase.url).origin,
  };
}

function parseOrigin(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`확장 ${label} 원점 설정이 필요합니다.`);
  }

  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`확장 ${label} 원점은 올바른 URL이어야 합니다.`);
  }

  const isLocalHttp =
    url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname.toLowerCase());

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error(`확장 운영 ${label} 원점은 HTTPS를 사용해야 합니다.`);
  }

  if (url.username || url.password) {
    throw new Error(`확장 ${label} 원점에 인증 정보를 포함할 수 없습니다.`);
  }

  return url.origin;
}
