import { describe, expect, it } from "vitest";
import { MockNotificationProvider } from "./mockNotificationProvider.js";

const request = {
  recipientPhone: "+821012345678",
  templateCode: "BJ_PREPARATION" as const,
  variables: { hospitalName: "바로진료병원", position: 6 },
};

describe("MockNotificationProvider", () => {
  it("기본 설정에서는 mock 메시지 ID와 성공 결과를 반환한다", async () => {
    const provider = new MockNotificationProvider();

    const result = await provider.send(request);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerMessageId).toMatch(/^mock-/);
  });

  it("실패 조건을 주입하면 실패 결과를 반환한다", async () => {
    const provider = new MockNotificationProvider({ shouldFail: () => true });

    await expect(provider.send(request)).resolves.toEqual({
      ok: false,
      provider: "mock_kakao",
      errorCode: "MOCK_DELIVERY_FAILED",
    });
  });
});
