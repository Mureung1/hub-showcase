import fs from 'node:fs';
import path from 'node:path';
import { db } from './index.js';

// `npm run db:migrate` 로 실행. schema.sql을 그대로 적용.
const schema = fs.readFileSync(path.join(process.cwd(), 'src/db/schema.sql'), 'utf-8');

db.query(schema)
  .then(() => {
    console.log('마이그레이션 완료: schema.sql 적용됨');
    return db.end();
  })
  .catch((err) => {
    console.error('마이그레이션 실패:', err.message);
    process.exit(1);
  });
