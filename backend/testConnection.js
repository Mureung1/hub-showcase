require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 1. Get Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_PROJECT_URL' || !supabaseKey) {
  console.error("❌ ERROR: .env 파일을 올바르게 설정해주세요.");
  process.exit(1);
}

// 2. Initialize Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("🔄 Supabase 연결 테스트 중...");
  
  try {
    // 3. Test Query: Check if the 'projects' table exists and fetch 1 row
    const { data, error } = await supabase.from('projects').select('*').limit(1);
    
    if (error) {
      if (error.code === '42P01') {
         console.error("❌ ERROR: 연결은 성공했지만 'projects' 테이블이 없습니다.");
         console.error("   Supabase 콘솔의 SQL Editor에서 schema.sql을 실행했는지 확인해주세요.");
      } else {
         console.error("❌ ERROR: 쿼리 실행 실패", error.message);
      }
      return;
    }
    
    console.log("✅ 성공! Supabase 연결 및 테이블 스키마 인식이 정상입니다.");
    console.log("   (데이터가 없다면 빈 배열이 출력됩니다.) 데이터:", data);
    
  } catch (err) {
    console.error("❌ ERROR: 서버 오류 발생", err.message);
  }
}

testConnection();
