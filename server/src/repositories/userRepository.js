import { pool } from '../db/pool.js'

/*
 * users 데이터 접근. 모든 함수는 db(기본 pool)를 받아,
 * 트랜잭션 중에는 호출부가 client를 넘겨 같은 연결을 유지한다.
 */

function toUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    nickname: row.nickname,
    role: row.role,
    baseAddress: row.base_address,
    baseLat: row.base_lat,
    baseLng: row.base_lng,
    notiLocationMode: row.noti_location_mode,
    notiRadiusKm: row.noti_radius_km,
  }
}

export async function findById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return rows.length ? toUser(rows[0]) : null
}

// 알림 설정 — 전달된 항목만 갱신 (COALESCE로 null이면 기존 값 유지)
export async function updateNotificationSettings(
  id,
  { notiLocationMode, notiRadiusKm },
  db = pool,
) {
  const { rows } = await db.query(
    `UPDATE users
     SET noti_location_mode = COALESCE($2, noti_location_mode),
         noti_radius_km = COALESCE($3, noti_radius_km)
     WHERE id = $1 RETURNING *`,
    [id, notiLocationMode ?? null, notiRadiusKm ?? null],
  )
  return rows.length ? toUser(rows[0]) : null
}

export async function listInterestCategories(userId, db = pool) {
  const { rows } = await db.query(
    'SELECT category FROM user_interest_categories WHERE user_id = $1 ORDER BY category',
    [userId],
  )
  return rows.map((r) => r.category)
}

// 관심 카테고리 전체 교체 — 호출부가 트랜잭션으로 감싼다
export async function replaceInterestCategories(userId, categories, db = pool) {
  await db.query('DELETE FROM user_interest_categories WHERE user_id = $1', [userId])
  if (categories.length > 0) {
    await db.query(
      `INSERT INTO user_interest_categories (user_id, category)
       SELECT $1, unnest($2::varchar[])`,
      [userId, categories],
    )
  }
}
