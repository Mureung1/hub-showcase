import { pool } from '../db/pool.js'
import { haversineKm } from './sql.js'

function toDeal(row) {
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

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10)

export async function insert(
  { storeId, name, category, originalPrice, salePrice, totalQty, pickupDeadlineAt },
  db = pool,
) {
  const { rows } = await db.query(
    `INSERT INTO deals
       (store_id, name, category, original_price, sale_price, total_qty, remaining_qty, pickup_deadline_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
     RETURNING *`,
    [storeId, name, category, originalPrice, salePrice, totalQty, pickupDeadlineAt],
  )
  return toDeal(rows[0])
}

export async function findById(dealId, db = pool) {
  const { rows } = await db.query('SELECT * FROM deals WHERE id = $1', [dealId])
  return rows.length ? toDeal(rows[0]) : null
}

// W3 대시보드 — 가게별 딜 + 예약/픽업 집계
export async function findByStoreIdWithCounts(storeId, db = pool) {
  const { rows } = await db.query(
    `SELECT d.*,
            COUNT(r.id) FILTER (WHERE r.status = 'reserved')::int AS reserved_count,
            COUNT(r.id) FILTER (WHERE r.status = 'picked')::int AS picked_count
     FROM deals d
     LEFT JOIN reservations r ON r.deal_id = d.id
     WHERE d.store_id = $1
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    [storeId],
  )
  return rows.map((row) => ({
    ...toDeal(row),
    reservedCount: row.reserved_count,
    pickedCount: row.picked_count,
  }))
}

// M2 — 기준 위치 반경 내 활성 딜을 거리순으로. 거리는 서브쿼리에서 1회 계산 후 재사용.
export async function findNearby({ lat, lng, radiusKm }, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM (
       SELECT d.*, s.name AS store_name,
              ${haversineKm('$1', '$2', 's.lat', 's.lng')} AS distance_km
       FROM deals d
       JOIN stores s ON s.id = d.store_id
       WHERE d.status = 'active' AND d.pickup_deadline_at > now() AND d.remaining_qty > 0
     ) nearby
     WHERE distance_km <= $3
     ORDER BY distance_km ASC`,
    [lat, lng, radiusKm],
  )
  return rows.map((row) => ({
    ...toDeal(row),
    storeName: row.store_name,
    distanceKm: round1(row.distance_km),
  }))
}

// M3 상세 — 기준 위치가 없으면 거리는 null
export async function findByIdWithStore(dealId, { lat, lng } = {}, db = pool) {
  const hasBase = lat != null && lng != null
  const { rows } = await db.query(
    `SELECT d.*, s.name AS store_name,
            ${hasBase ? haversineKm('$1', '$2', 's.lat', 's.lng') : 'NULL'} AS distance_km
     FROM deals d
     JOIN stores s ON s.id = d.store_id
     WHERE d.id = $3`,
    [lat ?? null, lng ?? null, dealId],
  )
  if (rows.length === 0) return null
  return {
    ...toDeal(rows[0]),
    storeName: rows[0].store_name,
    distanceKm: round1(rows[0].distance_km),
  }
}

/*
 * 선착순 재고의 원자적 차감 (T-08 — 이 프로젝트의 기술 셀링포인트).
 *
 * 조건 검사(remaining_qty >= qty)와 차감을 한 문장에서 수행한다.
 * 행 락 안에서 원자적으로 처리되므로 동시 요청이 몰려도 재고를 초과해 성공할 수 없다.
 * 차감에 실패하면 null을 반환한다(영향 행 0). DB의 CHECK(remaining_qty >= 0)가 최종 방어선.
 */
/*
 * 만료 처리 (T-14) — 픽업 마감이 지난 딜을 한 문장으로 정리한다.
 *
 * 세 가지가 원자적으로 함께 일어나야 불변식이 깨지지 않는다:
 *   1) 미픽업 예약(reserved) → expired
 *   2) 만료된 예약 수량만큼 remaining_qty 복원 (활성 예약이 줄었으므로)
 *   3) 딜 status → expired
 *
 * 이미 expired인 딜은 대상에서 빠지므로 반복 실행해도 안전하다(멱등).
 * 복원 결과가 total_qty를 넘으면 DB의 CHECK 제약이 최종 방어선으로 막는다.
 */
export async function expireOverdue(db = pool) {
  const { rows } = await db.query(
    `WITH expiring AS (
       SELECT id FROM deals
       WHERE pickup_deadline_at <= now() AND status <> 'expired'
       FOR UPDATE
     ),
     expired_rsv AS (
       UPDATE reservations r
       SET status = 'expired'
       WHERE r.status = 'reserved' AND r.deal_id IN (SELECT id FROM expiring)
       RETURNING r.deal_id, r.qty
     ),
     restored AS (
       SELECT deal_id, SUM(qty)::int AS qty FROM expired_rsv GROUP BY deal_id
     )
     UPDATE deals d
     SET status = 'expired',
         remaining_qty = d.remaining_qty + COALESCE(rst.qty, 0)
     FROM expiring e
     LEFT JOIN restored rst ON rst.deal_id = e.id
     WHERE d.id = e.id
     RETURNING d.id, d.name, COALESCE(rst.qty, 0) AS restored_qty`,
  )
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    restoredQty: r.restored_qty,
  }))
}

export async function decrementStock(dealId, qty, db = pool) {
  const { rows } = await db.query(
    `UPDATE deals
     SET remaining_qty = remaining_qty - $2,
         status = CASE WHEN remaining_qty - $2 = 0 THEN 'sold_out' ELSE status END
     WHERE id = $1
       AND status = 'active'
       AND pickup_deadline_at > now()
       AND remaining_qty >= $2
     RETURNING *`,
    [dealId, qty],
  )
  return rows.length ? toDeal(rows[0]) : null
}
