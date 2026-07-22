import { db } from '../db/index.js';

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

// 가본 곳(visited) / 가고 싶은 곳(wishlist) — 빵집 id 배열로 반환
export async function getBakeryStatuses(userId) {
  const { rows } = await db.query('SELECT bakery_id, status FROM user_bakery_status WHERE user_id = $1', [userId]);
  return {
    visited: rows.filter((r) => r.status === 'visited').map((r) => r.bakery_id),
    wishlist: rows.filter((r) => r.status === 'wishlist').map((r) => r.bakery_id),
  };
}

// 켜져 있으면 끄고, 꺼져 있으면 켠다. 반환값은 토글 후 상태(true=켜짐).
export async function toggleBakeryStatus(userId, bakeryId, status) {
  const { rows } = await db.query(
    'SELECT 1 FROM user_bakery_status WHERE user_id = $1 AND bakery_id = $2 AND status = $3',
    [userId, bakeryId, status]
  );
  if (rows.length) {
    await db.query('DELETE FROM user_bakery_status WHERE user_id = $1 AND bakery_id = $2 AND status = $3', [
      userId,
      bakeryId,
      status,
    ]);
    return false;
  }
  await db.query('INSERT INTO user_bakery_status (user_id, bakery_id, status) VALUES ($1, $2, $3)', [
    userId,
    bakeryId,
    status,
  ]);
  return true;
}
