import { withTransaction } from '../db/withTransaction.js'
import * as dealRepo from '../repositories/dealRepository.js'

// 기본 60초. 시연 중 짧게 보고 싶으면 server/.env에서 조절한다.
const INTERVAL_MS = Number(process.env.EXPIRY_INTERVAL_MS ?? 60_000)

/*
 * 만료 처리 (T-14) — 확정 정책: 픽업 마감이 지나면 예약을 단순 만료시키고 재고를 복원한다.
 * 딜 만료·예약 만료·재고 복원이 한 트랜잭션에서 함께 커밋되어야 불변식이 유지된다.
 */
export async function expireOverdue() {
  const expired = await withTransaction((client) => dealRepo.expireOverdue(client))
  if (expired.length > 0) {
    const restored = expired.reduce((sum, d) => sum + d.restoredQty, 0)
    console.log(`만료 처리: 딜 ${expired.length}건, 재고 복원 ${restored}개`)
  }
  return expired
}

/*
 * 주기 실행. 기동 직후 1회 실행하고 이후 간격마다 반복한다.
 * 조회 쿼리에도 pickup_deadline_at > now() 조건이 있으므로,
 * 잡이 아직 안 돈 짧은 창에도 마감된 딜이 사용자에게 노출되지 않는다(이중 방어).
 */
export function startExpiryScheduler() {
  const run = () => expireOverdue().catch((err) => console.error('만료 처리 실패:', err.message))

  run()
  const timer = setInterval(run, INTERVAL_MS)
  timer.unref?.() // 스크립트·테스트가 이 타이머 때문에 종료되지 않는 것을 방지
  console.log(`만료 스케줄러 시작 (${INTERVAL_MS}ms 간격)`)
  return timer
}
