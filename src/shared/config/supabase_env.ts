export type SupabaseEnv = {
  publishableKey: string;
  url: string;
};

type EnvSource = Readonly<Record<string, unknown>>;

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

function requireString(source: EnvSource, key: string, label: string) {
  const value = source[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Supabase ${label} 설정이 필요합니다.`);
  }

  return value.trim();
}

function validateUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Supabase URL은 올바른 URL이어야 합니다.');
  }

  const isLocalHttp =
    url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname.toLowerCase());

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('Supabase 운영 URL은 HTTPS를 사용해야 합니다.');
  }
}

function validatePublishableKey(value: string) {
  const normalized = value.toLowerCase();
  const jwtRole = readJwtRole(value);

  if (
    normalized.startsWith('sb_secret_') ||
    normalized.includes('service_role') ||
    jwtRole === 'service_role'
  ) {
    throw new Error('Supabase 비밀키는 브라우저 설정에 사용할 수 없습니다.');
  }

  if (!normalized.startsWith('sb_publishable_') && jwtRole !== 'anon') {
    throw new Error(
      'Supabase 공개 키 형식은 publishable key 또는 anon JWT여야 합니다.'
    );
  }
}

function readJwtRole(value: string) {
  const payload = value.split('.')[1];

  if (!payload) {
    return undefined;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(`${base64}${padding}`)) as unknown;

    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'role' in decoded &&
      typeof decoded.role === 'string'
    ) {
      return decoded.role;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function parseSupabaseEnv(source: EnvSource): SupabaseEnv {
  const url = requireString(source, 'VITE_SUPABASE_URL', 'URL');
  const publishableKey = requireString(
    source,
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    '공개 키'
  );

  validateUrl(url);
  validatePublishableKey(publishableKey);

  return { publishableKey, url };
}

export function getSupabaseEnv() {
  return parseSupabaseEnv(import.meta.env);
}
