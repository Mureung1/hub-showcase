require('dotenv').config({ path: '.env.local' });
// .env.local 파일을 읽어서 process.env에 값들을 채워넣기
// 이게 없으면 process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY 값이 undefined가 된다

const { createClient } = require('@supabase/supabase-js');
// Supabase 클라이언트 객체를 하나 만든다
// 여기서 service_role_key를 쓰기 때문에 이 supabase객체로 하는 모든 요청은 RLS를 무시하고 전체 테이블에 접근 가능

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
// 이 파일을 다른 곳에서 require('/services/supabase')로 불러오면 이미 초기화된 클라이언트 객체 하나를 그대로 받아 쓴다.
// 즉, 연결 설정을 한 곳에만 써두고 나머지 라우트 파일들은 이 파일만 갖다 쓰는 구조임