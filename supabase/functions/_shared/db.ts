// Supabase 서비스 롤 클라이언트 + 사용자 조회 헬퍼.
// 근거: docs/prd.md §2(profiles/discord_links 스키마),
//       docs/discord-linking.md §7.1(다중 사용자 라우팅 — discord_user_id 역조회)

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

let cachedClient: SupabaseClient | null = null;

/**
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY로 서비스 롤 클라이언트를 싱글턴 생성한다.
 * Supabase Edge Functions 런타임에는 이 두 환경변수가 자동 주입된다.
 */
export function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

export interface ResolvedUser {
  userId: string;
  notifyChannelId: string | null;
}

/**
 * 다중 사용자 라우팅(docs/discord-linking.md §7.1): 인터랙션의 실제 Discord user id로
 * discord_links를 역조회해 해당 Beacon 사용자를 해석한다.
 * 미연동(해당 discord_user_id로 링크된 사용자 없음)이면 null을 반환한다 — 호출부에서
 * "/연동" 안내로 분기한다(throw 아님).
 */
export async function resolveUserByDiscordId(
  client: SupabaseClient,
  discordUserId: string | null | undefined,
): Promise<ResolvedUser | null> {
  if (!discordUserId) return null;

  const { data: link, error } = await client
    .from("discord_links")
    .select("user_id, notify_channel_id")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`discord_links 역조회 실패: ${error.message}`);
  }
  if (!link) return null;

  return {
    userId: link.user_id as string,
    notifyChannelId: (link.notify_channel_id as string | undefined) ?? null,
  };
}
