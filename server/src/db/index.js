import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Supabase는 외부 접속에 SSL을 요구한다. Supabase가 자체 서명한 인증서를 쓰기 때문에
// rejectUnauthorized:false가 필요(로컬 개발 기준 — 운영 배포 시엔 더 엄격한 설정 검토).
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
