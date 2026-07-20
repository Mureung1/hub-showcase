import process from "node:process";

const REQUIRED_KEYS_MESSAGE =
  "Supabase 설정이 필요합니다: SUPABASE_URL과 SUPABASE_SECRET_KEY(또는 SUPABASE_SERVICE_ROLE_KEY)를 .env에 입력해 주세요.";

export function readSupabaseConfig(environment = process.env) {
  const url = environment.SUPABASE_URL?.trim();
  const secretKey = (
    environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (!url || !secretKey) {
    throw new Error(REQUIRED_KEYS_MESSAGE);
  }

  return { url, serviceRoleKey: secretKey };
}
