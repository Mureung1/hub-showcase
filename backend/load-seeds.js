import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'shortsgen.db');

try {
  const db = new Database(dbPath);

  const seedPath = path.join(__dirname, '../database/seeds/trend_keywords.sql');
  const seeds = fs.readFileSync(seedPath, 'utf-8');

  db.exec(seeds);

  console.log('✓ Seed 데이터 로드 완료');

  // 확인
  const count = db.prepare('SELECT COUNT(*) as cnt FROM trend_keywords').get();
  console.log(`✓ trend_keywords 테이블에 ${count.cnt}개 행 저장됨`);

  db.close();
} catch (error) {
  console.error('Seed 로드 실패:', error.message);
  process.exit(1);
}
