import { describe, it, expect } from "vitest";
import { aggregateTracking } from "./tracking";

describe("aggregateTracking", () => {
  it("사용 인원·발송 대상·귀속 매출을 집계한다", () => {
    const r = aggregateTracking([
      { order_amount: 12000, used_at: "2026-07-16T10:00:00Z" },
      { order_amount: 8000, used_at: "2026-07-16T11:00:00Z" },
      { order_amount: null, used_at: null }, // 미사용
    ]);
    expect(r).toEqual({ used: 2, target: 3, revenue: 20000 });
  });

  it("아무도 안 쓰면 0 (0명 나눗셈 방어 대상)", () => {
    const r = aggregateTracking([
      { order_amount: null, used_at: null },
      { order_amount: null, used_at: null },
    ]);
    expect(r).toEqual({ used: 0, target: 2, revenue: 0 });
  });

  it("발급 쿠폰이 없으면 전부 0", () => {
    expect(aggregateTracking([])).toEqual({ used: 0, target: 0, revenue: 0 });
  });
});
