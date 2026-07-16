// Postgres 연결 (postgres.js) — Neon/Supabase/Vercel Postgres 등 표준 연결 문자열
//
// 환경변수:
//   DATABASE_URL   postgres://user:pass@host/db   (필수)
//   DATABASE_SSL   'disable' 이면 SSL 끔(로컬). 기본 require.
import postgres, { type Sql } from 'postgres';

let sql: Sql | null = null;

export function db(): Sql {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
  sql = postgres(url, {
    ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
    max: 1, // 서버리스: 인스턴스당 커넥션 1개
    idle_timeout: 20,
  });
  return sql;
}

/** DATABASE_URL 설정 여부 (미설정 시 API는 인메모리/로컬 폴백) */
export function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
