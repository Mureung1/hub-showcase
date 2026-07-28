import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicProfile } from "./PublicProfile";

function response(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

function errorResponse(body: unknown) {
  return { ok: false, json: async () => body } as Response;
}

describe("PublicProfile", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("loads public fields and returns to the previous screen", async () => {
    const onBack = vi.fn();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          nickname: "잔잔한파도",
          bio: "밤의 음악",
          avatarUrl: null,
          isMe: false,
          isFollowing: true,
        },
      }))
      .mockResolvedValueOnce(response({
        data: { todayRecord: null, records: [], nextCursor: null },
      }));

    render(
      <PublicProfile
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
        onBack={onBack}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("음악 다이어리를 여는 중...");
    expect(await screen.findByRole("heading", { name: "잔잔한파도" })).toBeInTheDocument();
    expect(screen.getByText("밤의 음악")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      `http://localhost:3000/api/users/${encodeURIComponent("잔잔한파도")}`,
      {
        headers: { Authorization: "Bearer token" },
        signal: expect.any(AbortSignal),
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "← 음악 피드로 돌아가기" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("retries the same profile after a failed request", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse({
        error: { message: "프로필 조회 중 오류가 발생했습니다." },
      }))
      .mockResolvedValueOnce(response({
        data: {
          nickname: "잔잔한파도",
          bio: "밤의 음악",
          avatarUrl: null,
          isMe: false,
          isFollowing: false,
        },
      }))
      .mockResolvedValueOnce(response({
        data: { todayRecord: null, records: [], nextCursor: null },
      }));

    render(
      <PublicProfile
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로필 조회 중 오류가 발생했습니다.",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("heading", { name: "잔잔한파도" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `http://localhost:3000/api/users/${encodeURIComponent("잔잔한파도")}`,
      {
        headers: { Authorization: "Bearer token" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("updates the public profile follow state after server confirmation", async () => {
    const onFollowChange = vi.fn();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          nickname: "잔잔한파도",
          bio: "",
          avatarUrl: null,
          isMe: false,
          isFollowing: false,
        },
      }))
      .mockResolvedValueOnce(response({
        data: { todayRecord: null, records: [], nextCursor: null },
      }))
      .mockResolvedValueOnce(response({
        data: { followingNickname: "잔잔한파도", isFollowing: true },
      }));

    render(
      <PublicProfile
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
        onBack={vi.fn()}
        onFollowChange={onFollowChange}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "팔로우" }));

    expect(await screen.findByRole("button", { name: "언팔로우" })).toBeInTheDocument();
    expect(onFollowChange).toHaveBeenCalledTimes(1);
  });

  it("aborts the previous profile request when the URL target changes", async () => {
    let firstSignal: AbortSignal | undefined;
    const pendingRequest = new Promise<Response>(() => undefined);
    vi.mocked(fetch).mockImplementation((input, init) => {
      if (String(input).endsWith(`/api/users/${encodeURIComponent("잔잔한파도")}`)) {
        firstSignal = init?.signal ?? undefined;
        return pendingRequest;
      }
      return Promise.resolve(response({
        data: {
          nickname: "푸른기억",
          bio: "",
          avatarUrl: null,
          isMe: false,
          isFollowing: false,
        },
      }));
    });
    const { rerender } = render(
      <PublicProfile
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(firstSignal).toBeDefined();
    });
    rerender(
      <PublicProfile
        nickname="푸른기억"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
        onBack={vi.fn()}
      />,
    );

    expect(firstSignal?.aborted).toBe(true);
    expect(await screen.findByRole("heading", { name: "푸른기억" })).toBeInTheDocument();
  });
});
