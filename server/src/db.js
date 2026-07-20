// 3주차: SQLite(better-sqlite3) → Supabase Postgres(pg) 전환
// 이유: 여러 팀/여러 사용자가 동시에 접속하는 서비스로 발전시키려면
// 로컬 파일 기반 DB보다 원격 Postgres(Supabase)가 맞음.
// .env의 DATABASE_URL(Supabase pooler 연결 문자열)로 접속.
// models 파일들은 아직 better-sqlite3 문법(db.prepare 등)을 그대로 쓰고 있어서
// 이번 커밋에서는 db.js만 바꾸고, models 전환은 다음 작업에서 진행.

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase pooler는 자체 서명 인증서를 쓰기 때문에 rejectUnauthorized: false 필요.
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;

// ===== 이전 코드 (SQLite, 되돌릴 때 참고용) =====
// const fs = require('fs');
// const path = require('path');
// const Database = require('better-sqlite3');
//
// const dbDir = path.join(__dirname, '..', 'db');
// fs.mkdirSync(dbDir, { recursive: true });
//
// const db = new Database(path.join(dbDir, 'teamplan.db'));
// db.pragma('foreign_keys = ON');
//
// module.exports = db;
