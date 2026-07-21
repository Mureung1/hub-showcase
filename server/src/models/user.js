import { db } from '../db/index.js';

// 빵집 데이터가 아직 없어서 user_bakery_status(가본 곳/가고 싶은 곳)는 다루지 않는다.
// 빵집 데이터 수집 끝나면 그때 visited/wishlist 저장·조회를 여기 추가.
export async function findUserByUsername(username) {
  const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0];
}

export async function createUser(username, passwordHash) {
  const { rows } = await db.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
    [username, passwordHash]
  );
  return rows[0];
}

export async function getTastesByUserId(userId) {
  const { rows } = await db.query('SELECT taste FROM user_tastes WHERE user_id = $1', [userId]);
  return rows.map((row) => row.taste);
}

export async function setTastes(userId, tastes) {
  await Promise.all(
    tastes.map((taste) =>
      db.query('INSERT INTO user_tastes (user_id, taste) VALUES ($1, $2) ON CONFLICT (user_id, taste) DO NOTHING', [
        userId,
        taste,
      ])
    )
  );
}
