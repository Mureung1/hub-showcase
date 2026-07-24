import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key]);

let supabaseClient = null;

if (missingEnvVars.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `Supabase 클라이언트를 초기화하지 못했습니다. 다음 환경변수가 없습니다: ${missingEnvVars.join(", ")}. ` +
      "client/.env.example을 참고해 client/.env를 채워주세요. (실시간 채팅 기능만 동작하지 않고, 나머지 화면은 정상 동작합니다.)",
  );
} else {
  supabaseClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

export default supabaseClient;
