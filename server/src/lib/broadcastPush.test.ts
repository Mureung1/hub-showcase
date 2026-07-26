import { describe, it, expect, vi, beforeEach } from "vitest";

// DB 조회/삭제만 필요하므로 Prisma 싱글톤을 모킹한다 — 실제 DB에 접속하지 않는다.
vi.mock("../db/client.js", () => ({
  prisma: {
    pushSubscription: { findMany: vi.fn(), delete: vi.fn() },
  },
}));

// sendPush()는 이미 자체 테스트(sendPush.test.ts)가 있으므로 여기서는 결과만 모킹한다.
vi.mock("./sendPush.js", () => ({
  sendPush: vi.fn(),
}));

const { prisma } = await import("../db/client.js");
const { sendPush } = await import("./sendPush.js");
const { broadcastLevelUpPush } = await import("./broadcastPush.js");

const TASK = { id: "task-1", title: "과제", level: 2 } as import("@prisma/client").Task;

function subscription(id: string) {
  return {
    id,
    endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
    p256dh: "p256dh",
    auth: "auth",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("broadcastLevelUpPush", () => {
  beforeEach(() => {
    vi.mocked(prisma.pushSubscription.findMany).mockReset();
    vi.mocked(prisma.pushSubscription.delete).mockReset();
    vi.mocked(sendPush).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("구독이 0개면 발송도 삭제도 시도하지 않는다 (경계)", async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([]);

    await broadcastLevelUpPush(TASK);

    expect(sendPush).not.toHaveBeenCalled();
    expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
  });

  it("발송이 전부 성공하면 삭제하지 않는다 (happy path)", async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([subscription("sub-1")]);
    vi.mocked(sendPush).mockResolvedValue({ ok: true });

    await broadcastLevelUpPush(TASK);

    expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
  });

  it.each([410, 404])(
    "statusCode %i(만료/소멸)면 해당 구독을 삭제한다",
    async (statusCode) => {
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([subscription("sub-1")]);
      vi.mocked(sendPush).mockResolvedValue({
        ok: false,
        error: { code: "push_failed", message: "Gone", statusCode },
      });
      vi.mocked(prisma.pushSubscription.delete).mockResolvedValue(subscription("sub-1"));

      await broadcastLevelUpPush(TASK);

      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { id: "sub-1" },
      });
    },
  );

  it.each([400, 401, 403, 429])(
    "statusCode %i(구독 자체 문제가 아님)면 삭제하지 않는다 (경계)",
    async (statusCode) => {
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([subscription("sub-1")]);
      vi.mocked(sendPush).mockResolvedValue({
        ok: false,
        error: { code: "push_failed", message: "실패", statusCode },
      });

      await broadcastLevelUpPush(TASK);

      expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
    },
  );

  it("statusCode 없이 실패하면 삭제를 시도하지 않는다 (경계)", async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([subscription("sub-1")]);
    vi.mocked(sendPush).mockResolvedValue({
      ok: false,
      error: { code: "push_failed", message: "network down" },
    });

    await broadcastLevelUpPush(TASK);

    expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
  });

  it("여러 구독 중 410인 것만 정확히 골라 삭제한다", async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([
      subscription("sub-ok"),
      subscription("sub-gone"),
    ]);
    vi.mocked(sendPush).mockImplementation(async (id) =>
      id === "sub-gone"
        ? { ok: false, error: { code: "push_failed", message: "Gone", statusCode: 410 } }
        : { ok: true },
    );

    await broadcastLevelUpPush(TASK);

    expect(prisma.pushSubscription.delete).toHaveBeenCalledTimes(1);
    expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: "sub-gone" },
    });
  });

  it("이미 삭제된 row라 delete가 실패해도 에러를 삼키고 throw하지 않는다 (경계, #35 원칙과 동일)", async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([subscription("sub-1")]);
    vi.mocked(sendPush).mockResolvedValue({
      ok: false,
      error: { code: "push_failed", message: "Gone", statusCode: 410 },
    });
    vi.mocked(prisma.pushSubscription.delete).mockRejectedValue(
      new Error("Record to delete does not exist."),
    );

    await expect(broadcastLevelUpPush(TASK)).resolves.toBeUndefined();
  });

  it("sendPush 호출 자체가 reject돼도 삭제를 시도하지 않고 조용히 넘어간다 (경계)", async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([subscription("sub-1")]);
    vi.mocked(sendPush).mockRejectedValue(new Error("unexpected"));

    await expect(broadcastLevelUpPush(TASK)).resolves.toBeUndefined();
    expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
  });
});
