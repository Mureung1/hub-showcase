import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

const supabaseUrl: string = process.env.SUPABASE_URL || '';
const supabaseKey: string = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Warning: SUPABASE_URL or SUPABASE_KEY is missing from environment variables. Supabase client is not initialized.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * 매 요청마다 유저의 JWT 토큰을 Authorization 헤더에 바인딩한 Supabase 클라이언트를 동적으로 생성합니다.
 * 이를 통해 Supabase DB의 Row Level Security (RLS) 정책(auth.uid() = user_id)을 완벽히 준수합니다.
 */
export function getAuthenticatedSupabaseClient(token: string): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

export default supabase;
