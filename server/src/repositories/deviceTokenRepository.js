import { pool } from '../db/pool.js'

// 같은 토큰이 다시 등록되면 소유자만 갱신한다(기기를 다른 계정이 쓰는 경우)
export async function upsert(userId, token, db = pool) {
  await db.query(
    `INSERT INTO device_tokens (user_id, token) VALUES ($1, $2)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id`,
    [userId, token],
  )
}

export async function listTokensByUserIds(userIds, db = pool) {
  if (userIds.length === 0) return []
  const { rows } = await db.query(
    'SELECT token FROM device_tokens WHERE user_id = ANY($1::bigint[])',
    [userIds],
  )
  return rows.map((r) => r.token)
}

// FCM이 무효 판정한 토큰 정리 (앱 삭제·토큰 만료 등)
export async function removeTokens(tokens, db = pool) {
  if (tokens.length === 0) return
  await db.query('DELETE FROM device_tokens WHERE token = ANY($1::text[])', [tokens])
}
