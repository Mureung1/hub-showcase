import { pool } from '../db/pool.js'
import { haversineKm } from './sql.js'

/*
 * 알림 대상 판정 쿼리 (기획서 §3.2).
 *   (관심 카테고리 매칭 OR 즐겨찾기 매장) AND 위치 조건
 * 위치 조건: always는 거리 무관 통과, radius는 기준 위치가 매장 반경 이내일 때만.
 */
const DISTANCE = haversineKm('u.base_lat', 'u.base_lng', 'deal.lat', 'deal.lng')

export async function findTargets(dealId, db = pool) {
  const { rows } = await db.query(
    `WITH deal AS (
       SELECT d.id, d.category, d.store_id, s.lat, s.lng
       FROM deals d JOIN stores s ON s.id = d.store_id
       WHERE d.id = $1
     )
     SELECT u.id, u.nickname,
            (ic.user_id IS NOT NULL) AS by_category,
            (f.user_id IS NOT NULL) AS by_favorite,
            CASE WHEN u.base_lat IS NULL OR u.base_lng IS NULL THEN NULL
                 ELSE ${DISTANCE} END AS distance_km
     FROM users u
     CROSS JOIN deal
     LEFT JOIN user_interest_categories ic
            ON ic.user_id = u.id AND ic.category = deal.category
     LEFT JOIN favorites f
            ON f.user_id = u.id AND f.store_id = deal.store_id
     WHERE u.role = 'consumer'
       AND (ic.user_id IS NOT NULL OR f.user_id IS NOT NULL)
       AND (
         u.noti_location_mode = 'always'
         OR (
           u.base_lat IS NOT NULL AND u.base_lng IS NOT NULL
           AND ${DISTANCE} <= u.noti_radius_km
         )
       )`,
    [dealId],
  )
  return rows.map((r) => ({
    userId: Number(r.id),
    nickname: r.nickname,
    byCategory: r.by_category,
    byFavorite: r.by_favorite,
    distanceKm: r.distance_km == null ? null : Math.round(r.distance_km * 10) / 10,
  }))
}

export async function insertMany({ userIds, dealId, title, body }, db = pool) {
  await db.query(
    `INSERT INTO notifications (user_id, deal_id, title, body)
     SELECT unnest($1::bigint[]), $2, $3, $4`,
    [userIds, dealId, title, body],
  )
}

export async function listByUserId(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT id, deal_id, title, body, is_read, created_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [userId],
  )
  return rows.map((r) => ({
    id: Number(r.id),
    dealId: r.deal_id == null ? null : Number(r.deal_id),
    title: r.title,
    body: r.body,
    isRead: r.is_read,
    createdAt: r.created_at,
  }))
}
