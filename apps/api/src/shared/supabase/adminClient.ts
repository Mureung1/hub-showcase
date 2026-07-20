import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { loadEnv } from "../config/env.js";

/**
 * Secret Key(시스템 쓰기) Supabase Client (SPEC-DB-001 4장, ADR-002).
 * `SUPABASE_SECRET_KEY`로 생성하며 **RLS를 우회**한다.
 *
 * 이 Spec(DB-001)에서는 **도입·구성까지만** 한다. 실제 시스템 쓰기 사용
 * (SourceAnswer·Agenda·FinalAnswer 등 AI 파이프라인 저장·상태 갱신)은 각 AI Spec에서다.
 * 사용 시 Service 계층이 검증된 JWT의 userId로 대상 소유권을 확인한 뒤에만 수행하며,
 * 사용 범위를 시스템 쓰기 밖으로 확장하지 않는다(data-model 5장).
 */
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;

  const env = loadEnv();
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
