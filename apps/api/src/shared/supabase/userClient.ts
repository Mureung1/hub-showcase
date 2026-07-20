import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { loadEnv } from "../config/env.js";

/**
 * 사용자 JWT 전달 Supabase Client (SPEC-DB-001 4장, ADR-002).
 * 요청의 검증된 access token(SPEC-AUTH-003 authMiddleware 통과분)을 Authorization 헤더로
 * 전달해 **RLS가 적용된** 상태로 조회·사용자 쓰기를 수행한다.
 *
 * 요청마다 토큰이 다르므로 캐시하지 않고 매 요청 생성한다(공개 Publishable Key 사용).
 * 이 클라이언트로 실행되는 모든 쿼리는 `auth.uid()` = 토큰의 사용자로 RLS 판정된다.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  const env = loadEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
