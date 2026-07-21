import { pool } from '../db/pool.js'

/*
 * 알림 대상 판정 (T-11) — 기획서 §3.2의 핵심 로직.
 *
 *   발송 대상 = (관심 카테고리 매칭 OR 즐겨찾기 매장) AND 위치 조건 통과
 *
 * 위치 조건은 사용자별 설정을 따른다:
 *   - radius 모드: 기준 위치가 매장 반경 noti_radius_km 이내일 때만
 *   - always  모드: 거리와 무관하게 통과
 *
 * 거리 계산은 T-06과 동일한 Haversine(구면 코사인). PostGIS 전환은 Backlog.
 */
export async function findNotificationTargets(dealId) {
  const { rows } = await pool.query(
    `WITH deal AS (
       SELECT d.id, d.category, d.store_id, s.lat, s.lng
       FROM deals d JOIN stores s ON s.id = d.store_id
       WHERE d.id = $1
     )
     SELECT u.id, u.nickname,
            (ic.user_id IS NOT NULL) AS by_category,
            (f.user_id IS NOT NULL) AS by_favorite,
            CASE WHEN u.base_lat IS NULL OR u.base_lng IS NULL THEN NULL ELSE
              6371 * acos(LEAST(1,
                cos(radians(u.base_lat)) * cos(radians(deal.lat))
                * cos(radians(deal.lng) - radians(u.base_lng))
                + sin(radians(u.base_lat)) * sin(radians(deal.lat))
              ))
            END AS distance_km
     FROM users u
     CROSS JOIN deal
     LEFT JOIN user_interest_categories ic
            ON ic.user_id = u.id AND ic.category = deal.category
     LEFT JOIN favorites f
            ON f.user_id = u.id AND f.store_id = deal.store_id
     WHERE u.role = 'consumer'
       -- 관심 조건: 카테고리 매칭 OR 즐겨찾기
       AND (ic.user_id IS NOT NULL OR f.user_id IS NOT NULL)
       -- 위치 조건: always는 무조건 통과, radius는 반경 이내만
       AND (
         u.noti_location_mode = 'always'
         OR (
           u.base_lat IS NOT NULL AND u.base_lng IS NOT NULL
           AND 6371 * acos(LEAST(1,
                 cos(radians(u.base_lat)) * cos(radians(deal.lat))
                 * cos(radians(deal.lng) - radians(u.base_lng))
                 + sin(radians(u.base_lat)) * sin(radians(deal.lat))
               )) <= u.noti_radius_km
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

/*
 * 딜 등록 시 알림 생성 — 인앱 알림 행을 남긴다.
 * FCM 푸시 발송은 T-13에서 이 함수 뒤에 붙인다.
 * 호출부(딜 등록)의 응답을 막지 않도록 실패해도 예외를 삼키고 로그만 남긴다.
 */
export async function notifyDealCreated(deal, storeName) {
  try {
    const targets = await findNotificationTargets(deal.id)
    if (targets.length === 0) return { targetCount: 0 }

    const title = `${storeName} 마감 할인`
    const body = `${deal.name} ${deal.originalPrice.toLocaleString()}원 → ${deal.salePrice.toLocaleString()}원`

    await pool.query(
      `INSERT INTO notifications (user_id, deal_id, title, body)
       SELECT unnest($1::bigint[]), $2, $3, $4`,
      [targets.map((t) => t.userId), deal.id, title, body],
    )

    // TODO(T-13): 여기서 device_tokens를 조회해 FCM 푸시 발송
    return { targetCount: targets.length }
  } catch (err) {
    console.error('알림 생성 실패 (딜 등록은 정상 처리됨):', err.message)
    return { targetCount: 0, failed: true }
  }
}

// 인앱 알림 목록
export async function listMyNotifications(userId) {
  const { rows } = await pool.query(
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
