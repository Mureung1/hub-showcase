import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[DB] 오류: Supabase 연결 정보가 필요합니다.');
  console.error('[DB] .env 파일에 다음을 설정하세요:');
  console.error('[DB]   SUPABASE_URL=https://your-project.supabase.co');
  console.error('[DB]   SUPABASE_KEY=your-anon-key');
  console.error('[DB]');
  console.error('[DB] docs/supabase_setup.md를 참고하여 Supabase 프로젝트를 설정하세요.');
  process.exit(1);
}

let supabase;

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabase;
}

export function initializeDatabase() {
  // Supabase는 연결 풀을 자동으로 관리하므로 추가 초기화 불필요
  const client = getSupabaseClient();
  console.log('[DB] Supabase 연결 완료');
  return client;
}

export default {
  getSupabaseClient,
  initializeDatabase
};
