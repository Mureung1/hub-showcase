import { db } from '../db/index.js';

// 빵집 데이터가 아직 없어서 user_bakery_status(가본 곳/가고 싶은 곳)는 다루지 않는다.
// 빵집 데이터 수집 끝나면 그때 visited/wishlist 저장·조회를 여기 추가.
export function findUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser(username, passwordHash) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, passwordHash);
  return findUserById(lastInsertRowid);
}

export function getTastesByUserId(userId) {
  return db
    .prepare('SELECT taste FROM user_tastes WHERE user_id = ?')
    .all(userId)
    .map((row) => row.taste);
}

export function setTastes(userId, tastes) {
  const insert = db.prepare('INSERT OR IGNORE INTO user_tastes (user_id, taste) VALUES (?, ?)');
  const insertMany = db.transaction((list) => {
    list.forEach((taste) => insert.run(userId, taste));
  });
  insertMany(tastes);
}
