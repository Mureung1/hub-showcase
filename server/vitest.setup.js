// src/index.js와 동일하게, 테스트도 .env의 SUPABASE_* 값을 읽어야
// 실제 Supabase에 연결할 수 있다.
try {
  process.loadEnvFile();
} catch {
  // .env가 없으면 기본값으로 동작한다.
}
