const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

// service_role key: RLS를 우회하는 서버 전용 클라이언트. 일반 DB 접근과 auth.admin.* 호출에 사용한다.
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// anon key: 로그인처럼 사용자 자신의 자격 증명으로 인증하는 흐름에 사용한다.
const supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabase, supabaseAnon };
