import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransferInvitation } from "./transferInvitationApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createTransferInvitation", () => {
  it("Firebase 토큰으로 레시피의 전달 초대를 생성한다", async () => {
    const invitation = {
      invitationId: "invitation-id",
      transferPath: "/transfer-invitations/link-token",
      invitationCode: "ABCD-1234",
      createdAt: "2026-07-26T14:00:00.000Z",
      expiresAt: "2026-08-02T14:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: invitation }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createTransferInvitation("firebase-token", "recipe-id"),
    ).resolves.toEqual(invitation);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [path, request] = fetchMock.mock.calls[0];

    expect(path).toBe(
      "/api/recipes/recipe-id/transfer-invitations",
    );
    expect(request.method).toBe("POST");
    expect(request.headers.get("Authorization")).toBe(
      "Bearer firebase-token",
    );
    expect(request.body).toBeUndefined();
  });
});
