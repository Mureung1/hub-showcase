import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "@decision-log/shared";

import { loadEnv } from "../../shared/config/env.js";
import { getDecryptedProviderKey } from "../providerKeys/providerKeys.repository.js";
import { ALL_PROVIDERS } from "./providers/registry.js";

/**
 * BYOK 하이브리드 해석 (SPEC-AI-001 7장).
 *
 * 7.1 키 조회 순서(Provider별):
 *   1) user_provider_keys에 사용자 키가 있으면 → 그 키(복호)
 *   2) 없고 APP_DEFAULT_AI_KEYS_ENABLED=ON 이면 → 앱 기본 키(env)
 *   3) 둘 다 없으면 → "사용 가능한 키 없음"
 *
 * 평문 키는 반환값으로만 흐르며 로그·에러·응답에 남기지 않는다.
 */

function appKeyFor(provider: AiProvider): string | null {
  const env = loadEnv();
  if (!env.APP_DEFAULT_AI_KEYS_ENABLED) return null;
  switch (provider) {
    case "claude":
      return env.ANTHROPIC_API_KEY ?? null;
    case "openai":
      return env.OPENAI_API_KEY ?? null;
    case "gemini":
      return env.GEMINI_API_KEY ?? null;
  }
}

/**
 * 사용할 키를 해석한다. userId는 반드시 검증된 JWT에서 온 값이어야 한다.
 * 사용자 키 조회는 RLS가 적용된 사용자 클라이언트로 수행한다.
 */
export async function resolveProviderKey(
  userClient: SupabaseClient,
  userId: string,
  provider: AiProvider,
): Promise<string | null> {
  const userKey = await getDecryptedProviderKey(userClient, userId, provider);
  if (userKey) return userKey;
  return appKeyFor(provider);
}

/**
 * 7.3 사전 점검(pre-flight) — 생성 시작 전 게이트.
 * 3사 각각 7.1 순서로 쓸 키가 있는지 확인하고, 해석된 키 맵과 없는 Provider 목록을 돌려준다.
 * 하나라도 없으면 호출부가 생성을 시작하지 않는다(어떤 저장도 하지 않음).
 */
export async function preflightProviderKeys(
  userClient: SupabaseClient,
  userId: string,
): Promise<{
  keys: Map<AiProvider, string>;
  missing: AiProvider[];
}> {
  const keys = new Map<AiProvider, string>();
  const missing: AiProvider[] = [];

  for (const provider of ALL_PROVIDERS) {
    const key = await resolveProviderKey(userClient, userId, provider);
    if (key) keys.set(provider, key);
    else missing.push(provider);
  }

  return { keys, missing };
}
