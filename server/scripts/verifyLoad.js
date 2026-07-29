import 'dotenv/config'
import { pool } from '../src/db/pool.js'

/*
 * 부하 테스트 결과 검증 (T-15).
 *
 * 기획서 §4의 핵심 불변식을 DB 상태로 직접 검증한다.
 *   Deal.남은수량 = 총수량 - Σ(활성 Reservation.수량),  항상 >= 0
 *
 * k6의 성공 응답 수를 세는 것만으로는 부족하다. 오버셀은 "성공 응답이 정상적으로 왔는데
 * 실제로는 재고보다 많이 팔린" 상태이므로, 판정 근거는 반드시 DB여야 한다.
 *
 *   npm run verify:load -w server
 */

const LOAD_DEAL_NAME = '[부하테스트] 선착순 상품'

async function verify() {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.total_qty, d.remaining_qty, d.status,
            COALESCE(SUM(r.qty) FILTER (WHERE r.status IN ('reserved', 'picked')), 0)::int AS active_qty,
            COUNT(r.id) FILTER (WHERE r.status IN ('reserved', 'picked'))::int AS active_count
     FROM deals d
     LEFT JOIN reservations r ON r.deal_id = d.id
     WHERE d.name = $1
     GROUP BY d.id
     ORDER BY d.id DESC
     LIMIT 1`,
    [LOAD_DEAL_NAME],
  )

  if (rows.length === 0) {
    throw new Error('부하 테스트 딜이 없습니다. 먼저 seedLoad.js 를 실행하세요.')
  }

  const d = rows[0]
  const total = d.total_qty
  const remaining = d.remaining_qty
  const sold = d.active_qty

  // 픽업코드 중복 (활성 예약 안에서 유일해야 한다)
  const { rows: dupRows } = await pool.query(
    `SELECT pickup_code, COUNT(*)::int AS n
     FROM reservations
     WHERE deal_id = $1 AND status = 'reserved'
     GROUP BY pickup_code HAVING COUNT(*) > 1`,
    [d.id],
  )

  const checks = [
    {
      name: '오버셀 없음 (판매 수량 <= 총 수량)',
      pass: sold <= total,
      detail: `판매 ${sold} / 총 ${total}`,
    },
    {
      name: '재고 불변식 (남은 = 총 - 판매)',
      pass: remaining === total - sold,
      detail: `남은 ${remaining} === ${total} - ${sold} = ${total - sold}`,
    },
    {
      name: '재고 음수 아님',
      pass: remaining >= 0,
      detail: `남은 ${remaining}`,
    },
    {
      name: '픽업코드 중복 없음',
      pass: dupRows.length === 0,
      detail: dupRows.length === 0 ? '중복 0건' : `중복 ${dupRows.length}건`,
    },
  ]

  console.log(`\n딜 #${d.id} "${d.name}" (status=${d.status})`)
  console.log(`총 ${total} · 남은 ${remaining} · 활성 예약 ${d.active_count}건 / ${sold}개\n`)

  for (const c of checks) {
    console.log(`${c.pass ? '[통과]' : '[실패]'} ${c.name} — ${c.detail}`)
  }

  const failed = checks.filter((c) => !c.pass)
  if (failed.length > 0) {
    console.log(`\n결과: 실패 ${failed.length}건 — 오버셀 ${Math.max(0, sold - total)}개`)
    process.exitCode = 1
  } else {
    console.log('\n결과: 전 항목 통과')
  }
}

verify()
  .catch((err) => {
    // message가 비어 있는 오류(예: DB 연결 거부)가 있어 전체를 찍는다
    console.error('검증 실패:', err.message || err.code || '')
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
