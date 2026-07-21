import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * campaigns 라우트 상태 전이·발송 분기 테스트 (4-4 빈 곳 보강).
 * Supabase(db/queries)·Solapi(sms/solapi)만 목킹하고, 법적 필터(planAdSend)·
 * 가드레일(checkGuardrails)은 실제 순수 함수를 그대로 태워 라우트 배선을 검증한다.
 */

vi.mock("../db/queries", () => ({
  getCampaignById: vi.fn(),
  updateCampaign: vi.fn(),
  getStoreById: vi.fn(),
  getCustomers: vi.fn(),
  issueCouponsFor: vi.fn(),
  getCampaignCoupons: vi.fn(),
}));
vi.mock("../sms/solapi", () => ({ sendSms: vi.fn().mockResolvedValue(undefined) }));

import { campaignsRouter } from "./campaigns";
import * as db from "../db/queries";

const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

function proposal(discountValue: string) {
  return {
    title: "오늘의 캠페인",
    copy: "가벼운 안내 문구",
    promo: { type: "할인", value: discountValue },
    channels: ["dangol"],
  };
}
const consentCustomer = {
  id: "cust-a",
  phone: "010-0000-0001",
  consent_at: "2026-05-01T00:00:00Z",
  opt_out_at: null,
};

let base: string;
let server: Server;

beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use("/campaigns", campaignsRouter);
  server = app.listen(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => vi.clearAllMocks());

async function patch(id: string, body: unknown) {
  const res = await fetch(`${base}/campaigns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}
async function send(id: string, body: unknown) {
  const res = await fetch(`${base}/campaigns/${id}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("PATCH /campaigns/:id (상태 전이)", () => {
  it("허용된 status는 200으로 갱신된다", async () => {
    mockDb.updateCampaign.mockResolvedValue({ id: "c1", status: "approved" });
    const { status, body } = await patch("c1", { status: "approved" });
    expect(status).toBe(200);
    expect(body.status).toBe("approved");
    expect(mockDb.updateCampaign).toHaveBeenCalledWith("c1", { status: "approved" });
  });

  it("허용되지 않은 status는 400으로 거부한다", async () => {
    const { status } = await patch("c1", { status: "published" });
    expect(status).toBe(400);
    expect(mockDb.updateCampaign).not.toHaveBeenCalled();
  });

  it("변경 필드가 없으면 400", async () => {
    const { status } = await patch("c1", {});
    expect(status).toBe(400);
    expect(mockDb.updateCampaign).not.toHaveBeenCalled();
  });

  it("editedPromo가 updateCampaign으로 전달된다 (QW-4)", async () => {
    mockDb.updateCampaign.mockResolvedValue({ id: "c1", status: "approved" });
    await patch("c1", { editedPromo: { type: "할인", value: "10% 할인" } });
    expect(mockDb.updateCampaign).toHaveBeenCalledWith("c1", {
      editedPromo: { type: "할인", value: "10% 할인" },
    });
  });
});

describe("POST /campaigns/:id/send (발송 분기)", () => {
  it("없는 캠페인은 404", async () => {
    mockDb.getCampaignById.mockResolvedValue(null);
    const { status } = await send("x", { channels: ["dangol"] });
    expect(status).toBe(404);
  });

  it("할인율 20% 초과면 발송 직전 가드레일이 400으로 거부한다 (QW-4·UI 우회 방지)", async () => {
    mockDb.getCampaignById.mockResolvedValue({
      store_id: "s1",
      edited_copy: null,
      proposal: proposal("30% 할인"),
    });
    const { status, body } = await send("c1", { channels: ["dangol"] });
    expect(status).toBe(400);
    expect(String(body.error)).toContain("가드레일");
    expect(mockDb.issueCouponsFor).not.toHaveBeenCalled();
  });

  it("SNS 전용(단골 아님)은 문자 대상 0으로 sent", async () => {
    mockDb.getCampaignById.mockResolvedValue({
      store_id: "s1",
      edited_copy: null,
      proposal: proposal("10% 할인"),
    });
    mockDb.updateCampaign.mockResolvedValue({});
    const { status, body } = await send("c1", { channels: ["instagram"] });
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "sent", recipients: 0, couponCode: null });
  });

  it("단골 + 주간이면 쿠폰 발급 후 sent", async () => {
    mockDb.getCampaignById.mockResolvedValue({
      store_id: "s1",
      edited_copy: null,
      proposal: proposal("10% 할인"),
    });
    mockDb.getStoreById.mockResolvedValue({ name: "김사장 카페" });
    mockDb.getCustomers.mockResolvedValue([consentCustomer]);
    mockDb.issueCouponsFor.mockResolvedValue(["ABCDE"]);
    mockDb.updateCampaign.mockResolvedValue({});
    const { status, body } = await send("c1", { channels: ["dangol"], assumeNight: false });
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "sent", recipients: 1, couponCode: "ABCDE" });
  });

  it("단골이라도 수신동의 고객이 없으면 대상 0으로 걸러진다 (정보통신망법 동의필터)", async () => {
    mockDb.getCampaignById.mockResolvedValue({
      store_id: "s1",
      edited_copy: null,
      proposal: proposal("10% 할인"),
    });
    mockDb.getStoreById.mockResolvedValue({ name: "김사장 카페" });
    // 미동의(consent_at=null) 고객만 → filterConsented가 전부 제외
    mockDb.getCustomers.mockResolvedValue([{ ...consentCustomer, consent_at: null }]);
    mockDb.issueCouponsFor.mockResolvedValue([]);
    mockDb.updateCampaign.mockResolvedValue({});
    const { status, body } = await send("c1", { channels: ["dangol"], assumeNight: false });
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "sent", recipients: 0 });
  });

  it("단골 + 야간이면 발송하지 않고 scheduled", async () => {
    mockDb.getCampaignById.mockResolvedValue({
      store_id: "s1",
      edited_copy: null,
      proposal: proposal("10% 할인"),
    });
    mockDb.getStoreById.mockResolvedValue({ name: "김사장 카페" });
    mockDb.getCustomers.mockResolvedValue([consentCustomer]);
    mockDb.updateCampaign.mockResolvedValue({});
    const { status, body } = await send("c1", { channels: ["dangol"], assumeNight: true });
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: "scheduled", recipients: 1, couponCode: null });
    expect(mockDb.issueCouponsFor).not.toHaveBeenCalled();
  });
});
