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
