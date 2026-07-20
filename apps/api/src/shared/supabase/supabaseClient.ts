import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { loadEnv } from "../config/env.js";

/**
 * 서버용 Supabase Client (SPEC-AUTH-003 2.2).
 * - SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY(공개 키)로 1회 생성한다.
 * - 이 클라이언트는 토큰 검증(auth.getUser)에만 사용한다.
 * - 시스템 쓰기용 Secret Key Client는 이 Spec 범위 밖이다(DB Spec).
 *
 * 서버는 사용자 세션을 유지하지 않으므로 세션 저장·자동 갱신을 끈다.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;

  const env = loadEnv();
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
