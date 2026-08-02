import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

// Neon·Supabase 등 관리형 Postgres는 SSL을 요구한다. 로컬 Postgres로 테스트할 땐
// DATABASE_SSL=false 로 끈다.
const useSsl = process.env.DATABASE_SSL !== 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

// 서버 기동 시 1회 스키마 적용. 전부 IF NOT EXISTS라 여러 번 띄워도 안전하다.
export async function initDb() {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);
}

// 파라미터 바인딩 쿼리 헬퍼. 결과는 pg의 { rows, rowCount } 형태를 그대로 반환한다.
export function query(text, params) {
  return pool.query(text, params);
}

export default pool;
