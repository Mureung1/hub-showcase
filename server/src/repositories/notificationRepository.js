import { pool } from '../db/pool.js'
import { distanceKm, withinMeters, MAX_NOTI_RADIUS_KM } from './sql.js'

/*
 * 알림 대상 판정 쿼리 (기획서 §3.2).
 *   (관심 카테고리 매칭 OR 즐겨찾기 매장) AND 위치 조건
 * 위치 조건: always는 거리 무관 통과, radius는 기준 위치가 매장 반경 이내일 때만.
 *
 * 위치 조건을 UNION ALL로 나눈 이유:
 * `always OR 반경이내`를 하나의 OR로 두면 플래너가 GiST 인덱스를 쓰지 못한다
 * (한쪽 가지가 공간 조건이 아니므로 전체를 순차 스캔해야 한다).
 * noti_location_mode는 CHECK로 둘 중 하나라 두 가지가 겹치지 않아 UNION ALL이 안전하다.
 *
 * radius 가지가 조건을 두 번 거는 이유:
 * ST_DWithin은 거리 인자가 상수일 때만 인덱스를 탄다. 사용자별 반경(컬럼)으로는 못 타므로
 * 먼저 상한(MAX_NOTI_RADIUS_KM) 상수로 후보를 좁히고, 그다음 각자의 반경으로 정확히 거른다.
 */
const DEAL_GEOG = 'deal.geog'
const MAX_RADIUS_M = MAX_NOTI_RADIUS_KM * 1000

// 측정 스크립트(scripts/explainGeo.js)가 그대로 EXPLAIN 할 수 있도록 내보낸다.
export const FIND_TARGETS_SQL = `WITH deal AS (
       SELECT d.id, d.category, d.store_id, s.geog
       FROM deals d JOIN stores s ON s.id = d.store_id
       WHERE d.id = $1
     ),
     matched AS (
       SELECT u.id, u.nickname, u.geog
       FROM users u CROSS JOIN deal
       WHERE u.role = 'consumer' AND u.noti_location_mode = 'always'

       UNION ALL

       SELECT u.id, u.nickname, u.geog
       FROM users u CROSS JOIN deal
       WHERE u.role = 'consumer' AND u.noti_location_mode = 'radius'
         AND u.geog IS NOT NULL
         AND ${withinMeters('u.geog', DEAL_GEOG, MAX_RADIUS_M)}
         AND ${withinMeters('u.geog', DEAL_GEOG, 'u.noti_radius_km * 1000')}
     )
     SELECT m.id, m.nickname,
            (ic.user_id IS NOT NULL) AS by_category,
            (f.user_id IS NOT NULL) AS by_favorite,
            CASE WHEN m.geog IS NULL THEN NULL
                 ELSE ${distanceKm('m.geog', DEAL_GEOG)} END AS distance_km
     FROM matched m
     CROSS JOIN deal
     LEFT JOIN user_interest_categories ic
            ON ic.user_id = m.id AND ic.category = deal.category
     LEFT JOIN favorites f
            ON f.user_id = m.id AND f.store_id = deal.store_id
     WHERE ic.user_id IS NOT NULL OR f.user_id IS NOT NULL`

export async function findTargets(dealId, db = pool) {
  const { rows } = await db.query(FIND_TARGETS_SQL, [dealId])
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
