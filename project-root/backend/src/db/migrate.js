const fs = require('fs');
const path = require('path');
const db = require('./db');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

db.exec(schema);

console.log('✅ 마이그레이션 완료');