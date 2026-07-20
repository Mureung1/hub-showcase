require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('사용법: node runMigration.js <migrations/파일명.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(migrationFile), 'utf-8');

// DIRECT_URL의 비밀번호에 대괄호가 포함돼 있어 표준 URL 파서가 IPv6 표기로
// 오인해 깨진다. user/password/host를 직접 정규식으로 분리해 넘긴다.
const raw = process.env.DIRECT_URL;
const match = raw.match(/^postgresql:\/\/([^:]+):(.+)@([^@]+):(\d+)\/(.+)$/);
if (!match) {
  console.error('❌ DIRECT_URL 형식을 파싱하지 못했습니다.');
  process.exit(1);
}
const [, user, rawPassword, host, port, database] = match;
// Supabase 연결 문자열 템플릿의 [YOUR-PASSWORD] placeholder 대괄호가 남아있는 경우 제거.
const password = rawPassword.replace(/^\[(.*)\]$/, '$1');

const client = new Client({
  user,
  password,
  host,
  port: Number(port),
  database,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log(`🔄 마이그레이션 실행: ${migrationFile}`);
  await client.connect();
  try {
    await client.query(sql);
    console.log('✅ 마이그레이션 성공');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('❌ 마이그레이션 실패:', err.message);
  process.exit(1);
});
