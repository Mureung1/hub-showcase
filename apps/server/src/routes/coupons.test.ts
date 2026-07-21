import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * coupons redeem 경계 테스트 (4-4 빈 곳 보강).
 * redeemCoupon(db)만 목킹 — 없는/이미 사용된 코드는 false를 돌려주므로 409로 방어되는지 검증.
 */

vi.mock("../db/queries", () => ({ redeemCoupon: vi.fn() }));

import { couponsRouter } from "./coupons";
import * as db from "../db/queries";

const mockDb = db as unknown as { redeemCoupon: ReturnType<typeof vi.fn> };

let base: string;
let server: Server;

beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use("/coupons", couponsRouter);
  server = app.listen(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => vi.clearAllMocks());

async function redeem(code: string, body: unknown) {
  const res = await fetch(`${base}/coupons/${code}/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("POST /coupons/:code/redeem (경계)", () => {
  it("정상 사용은 200", async () => {
    mockDb.redeemCoupon.mockResolvedValue(true);
    const { status, body } = await redeem("ABCDE", { orderAmount: 12000 });
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, code: "ABCDE", orderAmount: 12000 });
  });

  it("없거나 이미 사용된 코드는 409", async () => {
    mockDb.redeemCoupon.mockResolvedValue(false);
    const { status } = await redeem("NOPE1", { orderAmount: 5000 });
    expect(status).toBe(409);
  });

  it("음수 orderAmount는 400 (redeem 호출 안 함)", async () => {
    const { status } = await redeem("ABCDE", { orderAmount: -100 });
    expect(status).toBe(400);
    expect(mockDb.redeemCoupon).not.toHaveBeenCalled();
  });
});
