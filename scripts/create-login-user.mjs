// 웹 로그인용 Supabase Auth 계정 + profiles 행 생성 (1단계 MVP 단일 사용자).
// .env에 BEACON_LOGIN_EMAIL / BEACON_LOGIN_PASSWORD 를 채운 뒤 실행: node scripts/create-login-user.mjs
// 비밀번호는 출력하지 않는다. 이미 계정이 있으면 profiles 행만 보장한다.
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
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BEACON_LOGIN_EMAIL, BEACON_LOGIN_PASSWORD } = env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 누락");
  process.exit(1);
}
if (!BEACON_LOGIN_EMAIL || !BEACON_LOGIN_PASSWORD) {
  console.error(".env에 BEACON_LOGIN_EMAIL / BEACON_LOGIN_PASSWORD 를 채워주세요.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId;
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: BEACON_LOGIN_EMAIL,
  password: BEACON_LOGIN_PASSWORD,
  email_confirm: true,
});

if (createError) {
  if (`${createError.message}`.includes("already been registered")) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;
    const found = list.users.find((u) => u.email === BEACON_LOGIN_EMAIL);
    if (!found) throw new Error("기존 계정을 찾지 못했습니다.");
    userId = found.id;
    console.log("[login-user] 기존 계정 사용:", userId);
  } else {
    throw createError;
  }
} else {
  userId = created.user.id;
  console.log("[login-user] 계정 생성 완료:", userId);
}

const { error: profileError } = await admin.from("profiles").upsert({ id: userId });
if (profileError) throw profileError;
console.log("[login-user] profiles 행 보장 완료. 웹 /login 에서 로그인할 수 있습니다.");
