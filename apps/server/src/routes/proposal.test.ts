import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * GET /proposal/today 폴백 테스트 (실패 대본 5-3).
 *
 * 오늘 제안이 없을 때 화면이 "만드는 중"에 갇히지 않고 지난 캠페인이라도 뜨는지,
 * 그리고 그게 **오늘 것인 척하지 않는지**(stale 표식) 검증한다.
 * campaigns.test.ts와 같은 패턴 — db만 목킹하고 라우트 배선은 실제로 태운다.
 */

vi.mock("../db/queries", () => ({
  getFirstStore: vi.fn(),
  getStoreById: vi.fn(),
  getSalesWithWeather: vi.fn(),
  saveTodayCampaign: vi.fn(),
  getTodayCampaign: vi.fn(),
  getLatestCampaignBefore: vi.fn(),
  todayYmdKst: vi.fn(() => "2026-07-31"),
}));

import { proposalRouter } from "./proposal";
import * as db from "../db/queries";

const mockDb = db as unknown as Record<string, ReturnType<typeof vi.fn>>;

const store = { id: "s1", name: "김사장 카페", category: "카페" };
const proposal = {
  title: "비 오는 날 픽업 할인",
  copy: "비 오는 오늘, 픽업으로 편하게",
  promo: { type: "할인", value: "픽업 10% 할인" },
  channels: ["dangol"],
};
const campaign = (id: string, date: string) => ({
  id,
  date,
  status: "draft",
  weather: { condition: "rain", isPrecipitating: true, sourceCount: 2 },
  proposal,
});

let base: string;
let server: Server;

beforeAll(() => {
  const app = express();
  app.use(express.json());
  app.use("/proposal", proposalRouter);
  server = app.listen(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.getFirstStore.mockResolvedValue(store);
  mockDb.getSalesWithWeather.mockResolvedValue([]); // 진단은 추정치로 계산됨
  mockDb.todayYmdKst.mockReturnValue("2026-07-31");
});

async function today() {
  const res = await fetch(`${base}/proposal/today`);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("GET /proposal/today", () => {
  it("오늘 제안이 있으면 그대로 주고 stale을 붙이지 않는다", async () => {
    mockDb.getTodayCampaign.mockResolvedValue(campaign("c-today", "2026-07-31"));

    const { status, body } = await today();

    expect(status).toBe(200);
    expect(body.campaignId).toBe("c-today");
    expect(body.date).toBe("2026-07-31");
    expect(body.stale).toBeUndefined(); // 정상 경로엔 표식이 없어야 한다
    expect(mockDb.getLatestCampaignBefore).not.toHaveBeenCalled(); // 폴백 조회 자체를 안 함
  });

  /**
   * 날씨·DB 장애로 오늘 생성이 실패한 상황. 예전엔 proposal:null만 돌려줘
   * 화면이 "오늘 제안을 만드는 중"에서 멈췄다 — 발표 중이면 그대로 끝난다.
   */
  it("오늘 것이 없으면 지난 캠페인을 대신 주고 stale:true를 붙인다", async () => {
    mockDb.getTodayCampaign.mockResolvedValue(null);
    mockDb.getLatestCampaignBefore.mockResolvedValue(campaign("c-yesterday", "2026-07-30"));

    const { status, body } = await today();

    expect(status).toBe(200);
    expect(body.campaignId).toBe("c-yesterday");
    expect(body.stale).toBe(true);
    expect(body.date).toBe("2026-07-30"); // 화면이 "언제 것"인지 표시할 수 있어야 한다
    expect(body.proposal).toEqual(proposal);
  });

  it("폴백은 오늘 날짜 '이전' 것만 찾는다", async () => {
    mockDb.getTodayCampaign.mockResolvedValue(null);
    mockDb.getLatestCampaignBefore.mockResolvedValue(campaign("c-old", "2026-07-29"));

    await today();

    expect(mockDb.getLatestCampaignBefore).toHaveBeenCalledWith("s1", "2026-07-31");
  });

  it("지난 캠페인도 없으면 기존대로 proposal:null + 안내 메시지", async () => {
    mockDb.getTodayCampaign.mockResolvedValue(null);
    mockDb.getLatestCampaignBefore.mockResolvedValue(null);

    const { status, body } = await today();

    expect(status).toBe(200);
    expect(body.proposal).toBeNull();
    expect(body.message).toContain("만드는 중");
    expect(body.stale).toBeUndefined();
  });

  it("stale 응답도 날씨는 그 캠페인이 만들어진 날 것을 준다 (문구와 앞뒤 맞추기)", async () => {
    mockDb.getTodayCampaign.mockResolvedValue(null);
    mockDb.getLatestCampaignBefore.mockResolvedValue(campaign("c-yesterday", "2026-07-30"));

    const { body } = await today();

    // 비 오는 날 문구를 보여주는 중이므로 날씨도 비여야 한다.
    expect((body.weather as Record<string, unknown>).condition).toBe("rain");
  });
});
