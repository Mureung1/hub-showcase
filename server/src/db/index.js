import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 .env에 설정되어야 합니다.");
}

// 서버 전용 클라이언트 — service_role key는 RLS를 우회하므로 절대 프론트에 노출하지 않는다.
export const supabase = createClient(supabaseUrl, supabaseKey);
