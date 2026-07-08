// Discord 계정/알림 채널을 단일 사용자(profiles)에 연결한다 (discord_links upsert).
// .env에 DISCORD_USER_ID / DISCORD_NOTIFY_CHANNEL_ID 를 채운 뒤 실행: node scripts/link-discord.mjs
// (DISCORD_USER_ID: Discord에서 내 프로필 우클릭 → "사용자 ID 복사",
//  DISCORD_NOTIFY_CHANNEL_ID: 알림 받을 채널 우클릭 → "채널 ID 복사" — 개발자 모드 필요)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  } catch { /* noop */ }
  return env;
}

const env = loadEnv();
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_USER_ID, DISCORD_NOTIFY_CHANNEL_ID } = env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 누락");
  process.exit(1);
}
if (!DISCORD_USER_ID || !DISCORD_NOTIFY_CHANNEL_ID) {
  console.error(".env에 DISCORD_USER_ID / DISCORD_NOTIFY_CHANNEL_ID 를 채워주세요.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile, error: profileError } = await admin
  .from("profiles").select("id").limit(1).maybeSingle();
if (profileError) throw profileError;
if (!profile) {
  console.error("profiles가 비어 있습니다. 먼저 node scripts/create-login-user.mjs 를 실행하세요.");
  process.exit(1);
}

const { error } = await admin.from("discord_links").upsert(
  {
    user_id: profile.id,
    discord_user_id: DISCORD_USER_ID,
    notify_channel_id: DISCORD_NOTIFY_CHANNEL_ID,
  },
  { onConflict: "user_id" },
);
if (error) throw error;
console.log("[link-discord] 연결 완료 — 알림 채널:", DISCORD_NOTIFY_CHANNEL_ID);
