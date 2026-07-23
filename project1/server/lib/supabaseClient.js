const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabaseClient] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env에 설정되지 않았습니다."
  );
}

// service_role 키는 RLS를 우회하는 강력한 권한을 가지므로, 반드시 서버(.env)에만 두고
// 클라이언트(React) 코드에는 절대 넣지 않는다.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
