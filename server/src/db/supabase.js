const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

const state = {};

if (process.env.NODE_ENV === 'test') {
  // 테스트 중엔 실제 Supabase 클라이언트를 절대 만들지 않는다. app을 require하기
  // 전에 __setTestClients(...)로 mock을 주입해야 하며, 주입 없이 어떤 메서드든 호출하면
  // 실제 네트워크 요청 대신 즉시 에러가 나도록 placeholder를 넣어둔다.
  const throwUnmocked = () => {
    throw new Error(
      'Supabase 클라이언트가 mock 주입 없이 테스트 중 사용되었습니다. ' +
        "app을 require하기 전에 __setTestClients(...)를 호출하세요.",
    );
  };
  state.supabase = new Proxy({}, { get: throwUnmocked });
  state.supabaseAnon = state.supabase;
} else {
  // service_role key: RLS를 우회하는 서버 전용 클라이언트. 일반 DB 접근과 auth.admin.* 호출에 사용한다.
  state.supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // anon key: 로그인처럼 사용자 자신의 자격 증명으로 인증하는 흐름에 사용한다.
  state.supabaseAnon = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function __setTestClients({ supabase, supabaseAnon }) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__setTestClients는 NODE_ENV=test에서만 사용할 수 있습니다.');
  }
  state.supabase = supabase;
  state.supabaseAnon = supabaseAnon ?? supabase;
}

module.exports = {
  get supabase() {
    return state.supabase;
  },
  get supabaseAnon() {
    return state.supabaseAnon;
  },
  __setTestClients,
};
