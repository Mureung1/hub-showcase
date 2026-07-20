import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AiProviderSchema, type AiProvider } from "@decision-log/shared";

import {
  encryptSecret,
  decryptSecret,
} from "../../shared/crypto/keyCipher.js";

/**
 * BYOK 사용자 키 저장·복호 경로 (SPEC-DB-001 3장).
 * - 저장: 평문 키를 서버에서 AES-256-GCM 암호화 후 암호문·IV·태그만 기록.
 * - 조회: 암호문을 서버에서 복호해 원문을 반환(사용 시점=AI Spec).
 * - 평문 키는 반환값 외에는 로그·에러에 남기지 않는다.
 *
 * 클라이언트는 주입받는다 — 사용자 행동(본인 키 저장)은 userClient(RLS, WITH CHECK
 * user_id=auth.uid()). 시스템 복호 사용은 AI Spec에서 방식 확정.
 * user_id는 반드시 검증된 JWT의 userId를 넘긴다(클라이언트 전달 값 불신뢰).
 */

/** DB 응답 검증 스키마(외부 데이터 — Repository 경계에서 Zod, CLAUDE.md 5·8). */
const providerKeyRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: AiProviderSchema,
  encrypted_key: z.string().min(1),
  key_iv: z.string().min(1),
  key_auth_tag: z.string().min(1),
});

export async function upsertProviderKey(
  client: SupabaseClient,
  userId: string,
  provider: AiProvider,
  plaintextKey: string,
): Promise<void> {
  const encrypted = encryptSecret(plaintextKey);
  const { error } = await client.from("user_provider_keys").upsert(
    {
      user_id: userId,
      provider,
      encrypted_key: encrypted.encryptedKey,
      key_iv: encrypted.keyIv,
      key_auth_tag: encrypted.keyAuthTag,
    },
    { onConflict: "user_id,provider" },
  );
  // 오류 메시지에 평문 키를 넣지 않는다.
  if (error) throw new Error(`provider key 저장 실패: ${error.message}`);
}

/** 저장된 키를 복호해 반환한다. 없으면 null. 반환 평문은 호출부(AI Spec)만 사용한다. */
export async function getDecryptedProviderKey(
  client: SupabaseClient,
  userId: string,
  provider: AiProvider,
): Promise<string | null> {
  const { data, error } = await client
    .from("user_provider_keys")
    .select("id, user_id, provider, encrypted_key, key_iv, key_auth_tag")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(`provider key 조회 실패: ${error.message}`);
  if (!data) return null;

  const row = providerKeyRowSchema.parse(data);
  return decryptSecret({
    encryptedKey: row.encrypted_key,
    keyIv: row.key_iv,
    keyAuthTag: row.key_auth_tag,
  });
}
