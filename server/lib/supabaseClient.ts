import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[supabaseClient] 환경변수 ${name}이(가) 설정되지 않았습니다. .env 파일을 .env.example 기준으로 채워주세요.`,
    );
  }
  return value;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    const url = requireEnv('SUPABASE_URL');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
    cachedClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}
