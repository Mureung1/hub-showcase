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
