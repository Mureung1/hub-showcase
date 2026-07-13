import Database from 'better-sqlite3';

const db = new Database('shortsgen.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('테이블:', tables.map(t => t.name));

const count = db.prepare('SELECT COUNT(*) as cnt FROM trend_keywords').get();
console.log('trend_keywords 행 수:', count.cnt);

const sample = db.prepare('SELECT * FROM trend_keywords LIMIT 3').all();
console.log('샘플 데이터:', sample);

const categoryCount = db.prepare('SELECT category, COUNT(*) as cnt FROM trend_keywords GROUP BY category').all();
console.log('카테고리별:', categoryCount);

db.close();
