// Supabase 서비스 롤 클라이언트 + MVP 단일 사용자 조회 헬퍼.
// 근거: docs/prd.md §1(단일 사용자 전제, 1단계 Edge Function은 service role로 동작 가능)
//       docs/prd.md §2(profiles/discord_links 스키마)

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

export interface SingleUser {
  userId: string;
  discordUserId: string | null;
  notifyChannelId: string | null;
}

/**
 * MVP 단일 사용자 조회: profiles 첫 행 + discord_links 조인.
 * profiles가 비어있으면(온보딩 전) throw한다.
 */
export async function getSingleUser(
  client: SupabaseClient,
): Promise<SingleUser> {
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new Error(`profiles 조회 실패: ${profileError.message}`);
  }
  if (!profile) {
    throw new Error(
      "profiles 테이블에 사용자가 없습니다. 온보딩(계정 생성)을 먼저 완료하세요.",
    );
  }

  const { data: link, error: linkError } = await client
    .from("discord_links")
    .select("discord_user_id, notify_channel_id")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (linkError) {
    throw new Error(`discord_links 조회 실패: ${linkError.message}`);
  }

  return {
    userId: profile.id as string,
    discordUserId: (link?.discord_user_id as string | undefined) ?? null,
    notifyChannelId: (link?.notify_channel_id as string | undefined) ?? null,
  };
}
