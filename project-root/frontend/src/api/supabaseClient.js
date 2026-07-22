// api/supabaseClient.js
// 프론트에서 직접 쓰는 Supabase 클라이언트. 로그인/회원가입(Supabase Auth) 전용.
// anon key는 공개용으로 설계된 키라 프론트 번들에 포함돼도 안전함 (service role key와는 다름).
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
