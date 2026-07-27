/*
 * 사장님 대시보드(W3) 집계 — 부수효과 없는 순수 함수.
 *
 * 서버에 요약 API를 따로 두지 않고, 이미 있는 두 응답을 조합해 계산한다.
 *   - deals:        GET /api/deals?storeId=
 *   - reservations: GET /api/reservations/store
 *
 * 주의: deals의 reservedCount/pickedCount는 예약 "건수"다(수량이 아님).
 * 사장님에게는 수량이 더 중요하므로 여기서는 예약 응답의 qty를 합산한다.
 */

const isSameDay = (iso, now) => {
  const d = new Date(iso)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

/*
 * 딜별 수량 분해 — { [dealId]: { reserved, picked, expired } }
 * 진행률 바가 "건수"가 아닌 "수량" 기준으로 그려지도록 한다.
 */
export function qtyByDeal(reservations = []) {
  const map = {}
  for (const r of reservations) {
    const slot = (map[r.dealId] ??= { reserved: 0, picked: 0, expired: 0 })
    if (slot[r.status] !== undefined) slot[r.status] += r.qty
  }
  return map
}

/*
 * 오늘 요약 4종.
 * "오늘"은 예약 생성 시각 기준이다(어제 예약을 오늘 픽업하면 어제로 잡힌다 — MVP 단순화).
 * 픽업 대기와 남은 재고는 시점과 무관한 현재 상태라 날짜를 따지지 않는다.
 */
export function todaySummary(reservations = [], deals = [], now = new Date()) {
  const pickedToday = reservations.filter(
    (r) => r.status === 'picked' && isSameDay(r.createdAt, now),
  )

  return {
    pickedQty: pickedToday.reduce((sum, r) => sum + r.qty, 0),
    revenue: pickedToday.reduce((sum, r) => sum + r.qty * r.salePrice, 0),
    waitingCount: reservations.filter((r) => r.status === 'reserved').length,
    remainingQty: deals
      .filter((d) => d.status === 'active')
      .reduce((sum, d) => sum + d.remainingQty, 0),
  }
}

/*
 * 픽업 마감까지 남은 시간.
 * 30분 이내면 urgent — 화면에서 앰버로 강조해 사장님이 먼저 챙기게 한다.
 */
export function remainingTime(iso, now = new Date()) {
  const diffMs = new Date(iso).getTime() - now.getTime()
  if (diffMs <= 0) return { text: '마감', expired: true, urgent: false }

  const totalMin = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  const text = hours > 0 ? `${hours}시간 ${mins}분 남음` : `${mins}분 남음`

  return { text, expired: false, urgent: totalMin <= 30 }
}
