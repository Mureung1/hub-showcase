const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/app.db');
const db = new Database(dbPath, { verbose: console.log }); // 개발 중엔 verbose로 로그 확인

db.pragma('journal_mode = WAL'); // 동시성/성능 위해 WAL 모드 권장

module.exports = db;