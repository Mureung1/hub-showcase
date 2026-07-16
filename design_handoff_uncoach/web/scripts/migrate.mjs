// DB 마이그레이션 — schema.sql 적용 (멱등). 실행: node scripts/migrate.mjs
// DATABASE_URL 환경변수 필요. .env.local 자동 로드(Next 규약).
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local 간단 로드
try {
  const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ DATABASE_URL 미설정 — .env.local 에 추가하세요.');
  process.exit(1);
}

const sql = postgres(url, { ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require', max: 1 });
const schema = readFileSync(join(__dirname, '..', 'src', 'lib', 'db', 'schema.sql'), 'utf8');

try {
  await sql.unsafe(schema);
  console.log('✓ 스키마 적용 완료 (profiles/sessions/assets/custom_situations/app_state)');
} catch (e) {
  console.error('✗ 마이그레이션 실패:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
