import { describe, it, expect, vi, beforeEach } from "vitest";

// DB 조회는 findUnique만 필요하므로 Prisma 싱글톤 자체를 모킹한다 — 실제 DB에 접속하지 않는다.
vi.mock("../db/client.js", () => ({
  prisma: { pushSubscription: { findUnique: vi.fn() } },
}));

// webpush.sendNotification은 외부 HTTP 호출(FCM 등)이라 모킹한다.
// WebPushError는 진짜 클래스를 그대로 써서 sendPush.ts의 instanceof 분기가 실제 라이브러리와
// 똑같이 동작하는지 확인한다(가짜 클래스로 대체하면 instanceof 체크 자체가 무의미해진다).
vi.mock("web-push", async () => {
  const actual = await vi.importActual<typeof import("web-push")>("web-push");
  const setVapidDetails = vi.fn();
  const sendNotification = vi.fn();
  return {
    ...actual,
    default: { ...actual, setVapidDetails, sendNotification },
    setVapidDetails,
    sendNotification,
  };
});

const { prisma } = await import("../db/client.js");
const webpush = (await import("web-push")).default;
const { WebPushError } = await import("web-push");
const { sendPush } = await import("./sendPush.js");

const SUBSCRIPTION = {
  id: "sub-1",
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  p256dh: "p256dh-value",
  auth: "auth-value",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("sendPush", () => {
  beforeEach(() => {
    vi.mocked(prisma.pushSubscription.findUnique).mockReset();
    vi.mocked(webpush.sendNotification).mockReset();
  });

  it("구독이 없으면 발송을 시도하지 않고 subscription_not_found를 반환한다 (경계)", async () => {
    vi.mocked(prisma.pushSubscription.findUnique).mockResolvedValue(null);

    const result = await sendPush("no-such-id", { title: "제목", body: "본문" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "subscription_not_found",
        message: expect.any(String),
        classification: "permanent",
      },
    });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("구독이 있고 발송이 성공하면 ok: true를 반환한다 (happy path)", async () => {
    vi.mocked(prisma.pushSubscription.findUnique).mockResolvedValue(SUBSCRIPTION);
    vi.mocked(webpush.sendNotification).mockResolvedValue({
      statusCode: 201,
      body: "",
      headers: {},
    });

    const result = await sendPush("sub-1", { title: "제목", body: "본문" });

    expect(result).toEqual({ ok: true });
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: SUBSCRIPTION.endpoint,
        keys: { p256dh: SUBSCRIPTION.p256dh, auth: SUBSCRIPTION.auth },
      },
      JSON.stringify({ title: "제목", body: "본문" }),
    );
  });

  it("만료된 구독이라 WebPushError가 발생하면 statusCode를 포함해 반환한다 (경계)", async () => {
    vi.mocked(prisma.pushSubscription.findUnique).mockResolvedValue(SUBSCRIPTION);
    vi.mocked(webpush.sendNotification).mockRejectedValue(
      new WebPushError("Gone", 410, {}, "", SUBSCRIPTION.endpoint),
    );

    const result = await sendPush("sub-1", { title: "제목", body: "본문" });

    expect(result).toEqual({
      ok: false,
      error: { code: "push_failed", message: "Gone", statusCode: 410, classification: "permanent" },
    });
  });

  it("WebPushError가 아닌 예외도 push_failed로 반환하고 temporary로 분류한다 (경계)", async () => {
    vi.mocked(prisma.pushSubscription.findUnique).mockResolvedValue(SUBSCRIPTION);
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error("network down"));

    const result = await sendPush("sub-1", { title: "제목", body: "본문" });

    expect(result).toEqual({
      ok: false,
      error: { code: "push_failed", message: "network down", classification: "temporary" },
    });
  });

  it.each([
    [404, "permanent"],
    [401, "config"],
    [403, "config"],
    [429, "rate_limited"],
    [500, "temporary"],
    [503, "temporary"],
    [400, "unknown"],
  ] as const)(
    "WebPushError statusCode %i는 classification %s로 분류한다 (#58)",
    async (statusCode, classification) => {
      vi.mocked(prisma.pushSubscription.findUnique).mockResolvedValue(SUBSCRIPTION);
      vi.mocked(webpush.sendNotification).mockRejectedValue(
        new WebPushError("실패", statusCode, {}, "", SUBSCRIPTION.endpoint),
      );

      const result = await sendPush("sub-1", { title: "제목", body: "본문" });

      expect(result).toEqual({
        ok: false,
        error: {
          code: "push_failed",
          message: "실패",
          statusCode,
          classification,
        },
      });
    },
  );
});
