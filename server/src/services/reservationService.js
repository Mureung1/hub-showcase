import { pool } from '../db/pool.js'
import { withTransaction } from '../db/withTransaction.js'
import { httpError } from '../lib/httpError.js'

const CODE_ATTEMPTS = 5
const randomCode = () => String(Math.floor(1000 + Math.random() * 9000))

function toReservationDto(row) {
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

/*
 * 예약 생성 (T-08) — 이 프로젝트의 기술 셀링포인트.
 *
 * 오버셀 방지의 핵심은 "확인 후 차감"이 아니라 **조건부 UPDATE 한 문장**이다.
 *   UPDATE ... SET remaining_qty = remaining_qty - $qty WHERE remaining_qty >= $qty
 * 이 문장은 행 단위 락 안에서 조건 검사와 차감이 한 번에 일어나므로,
 * 동시 요청이 몰려도 재고를 초과해 성공할 수 없다(영향 행 0 = 실패).
 * DB의 CHECK(remaining_qty >= 0)가 최종 방어선으로 한 겹 더 있다.
 */
export async function createReservation(userId, { dealId, qty }) {
  const id = Number(dealId)
  const quantity = Number(qty)
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, '딜 ID가 올바르지 않습니다.')
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw httpError(400, '수량은 1개 이상이어야 합니다.')
  }

  return withTransaction(async (client) => {
    // 조건부 원자적 차감 — 잔여가 0이 되면 sold_out으로 전이
    const { rows: updated } = await client.query(
      `UPDATE deals
       SET remaining_qty = remaining_qty - $2,
           status = CASE WHEN remaining_qty - $2 = 0 THEN 'sold_out' ELSE status END
       WHERE id = $1
         AND status = 'active'
         AND pickup_deadline_at > now()
         AND remaining_qty >= $2
       RETURNING id, name, remaining_qty, pickup_deadline_at`,
      [id, quantity],
    )

    if (updated.length === 0) {
      // 실패 원인 구분 (같은 트랜잭션 안에서 읽기)
      const { rows: deals } = await client.query(
        'SELECT status, remaining_qty, pickup_deadline_at FROM deals WHERE id = $1',
        [id],
      )
      if (deals.length === 0) throw httpError(404, '존재하지 않는 딜입니다.')
      const deal = deals[0]
      if (new Date(deal.pickup_deadline_at) <= new Date()) {
        throw httpError(409, '픽업 마감 시간이 지났습니다.')
      }
      if (deal.status !== 'active' || deal.remaining_qty < quantity) {
        throw httpError(409, '죄송해요, 방금 품절됐어요.')
      }
      throw httpError(409, '예약에 실패했습니다. 다시 시도해주세요.')
    }

    // 픽업코드 발급 — 활성 예약 중 유일해야 한다(partial unique index).
    // 충돌 시 트랜잭션 전체가 aborted 되지 않도록 SAVEPOINT로 되돌리고 재시도한다.
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const code = randomCode()
      await client.query('SAVEPOINT issue_code')
      try {
        const { rows } = await client.query(
          `INSERT INTO reservations (deal_id, user_id, qty, pickup_code)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [id, userId, quantity, code],
        )
        await client.query('RELEASE SAVEPOINT issue_code')
        return {
          ...toReservationDto(rows[0]),
          dealName: updated[0].name,
          remainingQty: updated[0].remaining_qty,
          pickupDeadlineAt: updated[0].pickup_deadline_at,
        }
      } catch (err) {
        if (err.code !== '23505') throw err // 유니크 위반이 아니면 그대로 전파
        await client.query('ROLLBACK TO SAVEPOINT issue_code')
      }
    }
    throw httpError(500, '픽업코드 발급에 실패했습니다. 다시 시도해주세요.')
  })
}

/*
 * 픽업 확인 (T-10) — 사장님이 코드를 검증해 완료 처리한다.
 * 활성 예약(status='reserved') 중에서만 코드가 유일하므로 코드로 단건 조회가 가능하다.
 */
export async function confirmPickup(userId, pickupCode) {
  const code = String(pickupCode ?? '').trim()
  if (!/^\d{4}$/.test(code)) throw httpError(400, '픽업코드는 4자리 숫자입니다.')

  const { rows: stores } = await pool.query('SELECT id FROM stores WHERE owner_id = $1', [userId])
  if (stores.length === 0) throw httpError(403, '가게 사장님만 픽업을 확인할 수 있습니다.')
  const storeId = stores[0].id

  return withTransaction(async (client) => {
    // 내 가게의 활성 예약만 대상. 행을 잠가 동시 확인 요청을 직렬화한다.
    const { rows } = await client.query(
      `SELECT r.id, r.qty, r.pickup_code, d.name AS deal_name, d.sale_price, u.nickname
       FROM reservations r
       JOIN deals d ON d.id = r.deal_id
       JOIN users u ON u.id = r.user_id
       WHERE r.pickup_code = $1 AND r.status = 'reserved' AND d.store_id = $2
       FOR UPDATE OF r`,
      [code, storeId],
    )
    if (rows.length === 0) {
      throw httpError(404, '유효하지 않거나 이미 처리된 코드입니다.')
    }

    const reservation = rows[0]
    await client.query(
      `UPDATE reservations SET status = 'picked', picked_at = now() WHERE id = $1`,
      [reservation.id],
    )

    return {
      id: Number(reservation.id),
      pickupCode: reservation.pickup_code,
      qty: reservation.qty,
      dealName: reservation.deal_name,
      salePrice: reservation.sale_price,
      nickname: reservation.nickname,
      status: 'picked',
    }
  })
}

// 내 예약 목록 (M4·T-09에서 사용)
export async function listMyReservations(userId) {
  const { rows } = await pool.query(
    `SELECT r.*, d.name AS deal_name, d.sale_price, d.pickup_deadline_at, s.name AS store_name
     FROM reservations r
     JOIN deals d ON d.id = r.deal_id
     JOIN stores s ON s.id = d.store_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId],
  )
  return rows.map((row) => ({
    ...toReservationDto(row),
    dealName: row.deal_name,
    salePrice: row.sale_price,
    storeName: row.store_name,
    pickupDeadlineAt: row.pickup_deadline_at,
  }))
}
