import { pool } from '../db/pool.js'
import { httpError } from '../lib/httpError.js'
import { CATEGORIES } from './storeService.js'

function toDealDto(row) {
  return {
    id: Number(row.id),
    storeId: Number(row.store_id),
    name: row.name,
    category: row.category,
    originalPrice: row.original_price,
    salePrice: row.sale_price,
    totalQty: row.total_qty,
    remainingQty: row.remaining_qty,
    pickupDeadlineAt: row.pickup_deadline_at,
    status: row.status,
    createdAt: row.created_at,
  }
}

// W2 딜 등록 — 등록 즉시 remaining_qty = total_qty, status = 'active'
export async function createDeal(userId, { name, category, originalPrice, salePrice, totalQty, pickupDeadlineAt }) {
  if (!name?.trim()) throw httpError(400, '상품명을 입력해주세요.')
  if (!CATEGORIES.includes(category)) throw httpError(400, '카테고리를 선택해주세요.')
  if (!Number.isInteger(totalQty) || totalQty <= 0) throw httpError(400, '수량은 1개 이상이어야 합니다.')
  if (!Number.isInteger(originalPrice) || originalPrice <= 0) throw httpError(400, '원가가 올바르지 않습니다.')
  if (!Number.isInteger(salePrice) || salePrice <= 0) throw httpError(400, '할인가가 올바르지 않습니다.')
  if (salePrice >= originalPrice) throw httpError(400, '할인가는 원가보다 낮아야 합니다.')

  const deadline = new Date(pickupDeadlineAt)
  if (Number.isNaN(deadline.getTime())) throw httpError(400, '픽업 마감 시각이 올바르지 않습니다.')
  if (deadline <= new Date()) throw httpError(400, '픽업 마감은 현재 시각 이후여야 합니다.')

  const { rows: stores } = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [userId])
  if (stores.length === 0) throw httpError(404, '가게를 먼저 등록해주세요.')

  const { rows } = await pool.query(
    `INSERT INTO deals
       (store_id, name, category, original_price, sale_price, total_qty, remaining_qty, pickup_deadline_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
     RETURNING *`,
    [stores[0].id, name.trim(), category, originalPrice, salePrice, totalQty, deadline.toISOString()],
  )
  const deal = toDealDto(rows[0])

  // TODO(T-11): 알림 트리거 지점 — 등록 직후 대상 판정((카테고리 OR 즐겨찾기) AND 위치조건)
  //             → FCM 푸시 + 인앱 알림 발송. 딜 등록 응답을 막지 않도록 비동기로 처리한다.

  return deal
}

// W3 대시보드 기초 — 가게별 딜 목록 (최신 등록 순)
export async function listDealsByStore(storeId) {
  if (!Number.isInteger(storeId) || storeId <= 0) throw httpError(400, 'storeId가 올바르지 않습니다.')
  const { rows } = await pool.query(
    'SELECT * FROM deals WHERE store_id = $1 ORDER BY created_at DESC',
    [storeId],
  )
  return rows.map(toDealDto)
}

function toNearbyDto(row) {
  return {
    ...toDealDto(row),
    storeName: row.store_name,
    distanceKm: Math.round(row.distance_km * 10) / 10,
  }
}

/*
 * M2 소비자 딜 목록 — 사용자 기준 위치에서 반경 내 활성 딜을 거리순으로 (T-06).
 * 거리: Haversine(구면 코사인). PostGIS 전환은 Backlog.
 * always 모드 사용자도 목록은 반경으로 제한한다(무한 목록 방지). 알림은 T-11에서 별도 처리.
 */
export async function listNearbyDeals(userId) {
  const { rows: users } = await pool.query(
    'SELECT base_lat, base_lng, noti_radius_km, role FROM users WHERE id = $1',
    [userId],
  )
  if (users.length === 0) throw httpError(401, '존재하지 않는 사용자입니다.')
  const user = users[0]
  if (user.base_lat == null || user.base_lng == null) {
    throw httpError(400, '기준 위치가 설정되지 않았습니다.')
  }

  // 6371 = 지구 반지름(km). LEAST(1, ...)로 부동소수 오차에 의한 acos 정의역 이탈 방지.
  // 거리 계산을 서브쿼리에서 한 번만 하고 바깥에서 반경 필터·정렬에 재사용한다.
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT d.*, s.name AS store_name,
              6371 * acos(LEAST(1,
                cos(radians($1)) * cos(radians(s.lat)) * cos(radians(s.lng) - radians($2))
                + sin(radians($1)) * sin(radians(s.lat))
              )) AS distance_km
       FROM deals d
       JOIN stores s ON s.id = d.store_id
       WHERE d.status = 'active' AND d.pickup_deadline_at > now() AND d.remaining_qty > 0
     ) nearby
     WHERE distance_km <= $3
     ORDER BY distance_km ASC`,
    [user.base_lat, user.base_lng, user.noti_radius_km],
  )
  return rows.map(toNearbyDto)
}
