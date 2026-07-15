import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트 (서버 전용).
 * secret 키로 접속하므로 RLS를 우회한다 — 절대 프론트에 노출하지 않는다.
 * 지연 초기화라 env가 없는 환경(일부 단위테스트)에서 import만으로는 터지지 않는다.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY 가 설정되지 않았습니다");
  }

  client = createClient(url, key, {
    auth: { persistSession: false }, // 서버라 세션 저장 불필요
  });
  return client;
}
