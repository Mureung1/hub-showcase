import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// 로컬 개발 환경에서는 .env를 읽고,
// Render에서는 등록된 환경변수를 process.env로 사용합니다.
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL 환경변수가 설정되지 않았습니다."
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);