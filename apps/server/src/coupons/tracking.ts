import type { TrackingResponse } from "shared";

/**
 * 캠페인 쿠폰 사용 집계 (추적 화면 데이터).
 * 순수 함수 — 라우트와 단위테스트가 공용으로 쓴다.
 * 실시간이 아니라 쿠폰 코드 기반 누적 집계다.
 */

export interface CouponUsageRow {
  order_amount: number | null;
  used_at: string | null;
}

/** 발급 쿠폰 행들로 사용 인원·귀속 매출을 집계한다. */
export function aggregateTracking(rows: CouponUsageRow[]): TrackingResponse {
  const target = rows.length;
  const usedRows = rows.filter((r) => r.used_at != null);
  const revenue = usedRows.reduce((sum, r) => sum + (r.order_amount ?? 0), 0);
  return { used: usedRows.length, target, revenue };
}
