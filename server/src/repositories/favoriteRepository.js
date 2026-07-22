import { pool } from '../db/pool.js'

export async function listStoreIdsByUser(userId, db = pool) {
  const { rows } = await db.query('SELECT store_id FROM favorites WHERE user_id = $1', [userId])
  return rows.map((r) => Number(r.store_id))
}

// 이미 있으면 무시 (PK 충돌) — 토글을 멱등하게 처리
export async function add(userId, storeId, db = pool) {
  await db.query(
    `INSERT INTO favorites (user_id, store_id) VALUES ($1, $2)
     ON CONFLICT (user_id, store_id) DO NOTHING`,
    [userId, storeId],
  )
}

export async function remove(userId, storeId, db = pool) {
  await db.query('DELETE FROM favorites WHERE user_id = $1 AND store_id = $2', [userId, storeId])
}
