import { pool } from '../db/pool.js'

function toReservation(row) {
  return {
    id: Number(row.id),
    dealId: Number(row.deal_id),
    userId: Number(row.user_id),
    qty: row.qty,
    pickupCode: row.pickup_code,
    status: row.status,
    createdAt: row.created_at,
    pickedAt: row.picked_at,
  }
}

export async function insert({ dealId, userId, qty, pickupCode }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO reservations (deal_id, user_id, qty, pickup_code)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [dealId, userId, qty, pickupCode],
  )
  return toReservation(rows[0])
}

/*
 * 픽업 확인용 조회 — 내 가게의 활성 예약만 대상.
 * FOR UPDATE로 행을 잠가 동시 확인 요청을 직렬화한다(중복 처리 차단).
 * 활성 예약 중에서만 코드가 유일하므로(partial unique index) 코드 단건 조회가 성립한다.
 */
export async function findActiveByCodeForUpdate(pickupCode, storeId, db = pool) {
  const { rows } = await db.query(
    `SELECT r.*, d.name AS deal_name, d.sale_price, u.nickname
     FROM reservations r
     JOIN deals d ON d.id = r.deal_id
     JOIN users u ON u.id = r.user_id
     WHERE r.pickup_code = $1 AND r.status = 'reserved' AND d.store_id = $2
     FOR UPDATE OF r`,
    [pickupCode, storeId],
  )
  if (rows.length === 0) return null
  return {
    ...toReservation(rows[0]),
    dealName: rows[0].deal_name,
    salePrice: rows[0].sale_price,
    nickname: rows[0].nickname,
  }
}

export async function markPicked(id, db = pool) {
  const { rows } = await db.query(
    `UPDATE reservations SET status = 'picked', picked_at = now()
     WHERE id = $1 RETURNING *`,
    [id],
  )
  return rows.length ? toReservation(rows[0]) : null
}

export async function listByUserId(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT r.*, d.name AS deal_name, d.sale_price, d.pickup_deadline_at, s.name AS store_name
     FROM reservations r
     JOIN deals d ON d.id = r.deal_id
     JOIN stores s ON s.id = d.store_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId],
  )
  return rows.map((row) => ({
    ...toReservation(row),
    dealName: row.deal_name,
    salePrice: row.sale_price,
    storeName: row.store_name,
    pickupDeadlineAt: row.pickup_deadline_at,
  }))
}

// 사장님 화면 — 내 가게에 들어온 예약 목록 (예약자 닉네임·상품·상태)
export async function listByStoreId(storeId, db = pool) {
  const { rows } = await db.query(
    `SELECT r.*, d.name AS deal_name, d.sale_price, u.nickname
     FROM reservations r
     JOIN deals d ON d.id = r.deal_id
     JOIN users u ON u.id = r.user_id
     WHERE d.store_id = $1
     ORDER BY r.created_at DESC`,
    [storeId],
  )
  return rows.map((row) => ({
    ...toReservation(row),
    dealName: row.deal_name,
    salePrice: row.sale_price,
    nickname: row.nickname,
  }))
}
