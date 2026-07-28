import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicLikeUsers } from "./MusicLikeUsers";

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("MusicLikeUsers", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("loads only after expansion and reuses the list after closing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        recordId: "7",
        likeCount: 2,
        users: [
          { nickname: "잔잔한파도", avatarUrl: null },
          { nickname: "고요한수영", avatarUrl: "https://example.com/avatar.jpg" },
        ],
        nextCursor: null,
      },
    }));
    render(
      <MusicLikeUsers
        recordId={7}
        likeCount={2}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
      />,
    );

    const toggle = screen.getByRole("button", { name: "2명이 기억했어요" });
    expect(fetch).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText("잔잔한파도")).toBeInTheDocument();
    expect(screen.getByText("고요한수영")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/music-records/7/likes",
      {
        headers: { Authorization: "Bearer valid-token" },
        signal: expect.any(AbortSignal),
      },
    );

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(await screen.findByText("잔잔한파도")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("opens a public profile from a like user", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        recordId: "7",
        likeCount: 1,
        users: [{ nickname: "잔잔한파도", avatarUrl: null }],
        nextCursor: null,
      },
    }));
    const onOpenProfile = vi.fn();
    render(
      <MusicLikeUsers
        recordId={7}
        likeCount={1}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        onOpenProfile={onOpenProfile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "1명이 기억했어요" }));
    fireEvent.click(await screen.findByRole("button", { name: "잔잔한파도" }));

    expect(onOpenProfile).toHaveBeenCalledWith("잔잔한파도");
  });

  it("loads the next page without duplicating users", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          recordId: "7",
          likeCount: 21,
          users: [
            { nickname: "잔잔한파도", avatarUrl: null },
            { nickname: "고요한수영", avatarUrl: null },
          ],
          nextCursor: "next-page",
        },
      }))
      .mockResolvedValueOnce(response({
        data: {
          recordId: "7",
          likeCount: 21,
          users: [
            { nickname: "고요한수영", avatarUrl: null },
            { nickname: "새벽의파도", avatarUrl: null },
          ],
          nextCursor: null,
        },
      }));
    render(
      <MusicLikeUsers
        recordId={7}
        likeCount={21}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "21명이 기억했어요" }));
    fireEvent.click(await screen.findByRole("button", { name: "더 보기" }));

    expect(await screen.findByText("새벽의파도")).toBeInTheDocument();
    expect(screen.getAllByText("고요한수영")).toHaveLength(1);
    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/music-records/7/likes?cursor=next-page",
      {
        headers: { Authorization: "Bearer valid-token" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("shows a failure without closing the panel and retries", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        error: { message: "함께 기억한 사람을 불러오지 못했어요." },
      }, false))
      .mockResolvedValueOnce(response({
        data: {
          recordId: "7",
          likeCount: 1,
          users: [{ nickname: "잔잔한파도", avatarUrl: null }],
          nextCursor: null,
        },
      }));
    render(
      <MusicLikeUsers
        recordId={7}
        likeCount={1}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
      />,
    );

    const toggle = screen.getByRole("button", { name: "1명이 기억했어요" });
    fireEvent.click(toggle);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "함께 기억한 사람을 불러오지 못했어요.",
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("잔잔한파도")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses the list-specific fallback when an error response is unreadable", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Response);
    render(
      <MusicLikeUsers
        recordId={7}
        likeCount={1}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "1명이 기억했어요" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "함께 기억한 사람을 불러오지 못했어요.",
    );
  });

  it("shows a quiet empty state when the list has changed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        recordId: "7",
        likeCount: 0,
        users: [],
        nextCursor: null,
      },
    }));
    const onLikeCountChange = vi.fn();
    render(
      <MusicLikeUsers
        recordId={7}
        likeCount={1}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        onLikeCountChange={onLikeCountChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "1명이 기억했어요" }));

    expect(await screen.findByText("아직 함께 기억한 사람을 찾지 못했어요.")).toBeInTheDocument();
    expect(onLikeCountChange).toHaveBeenCalledWith(7, 0);
  });

  it("refreshes an open list when the like count changes", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          recordId: "7",
          likeCount: 2,
          users: [
            { nickname: "잔잔한파도", avatarUrl: null },
            { nickname: "고요한수영", avatarUrl: null },
          ],
          nextCursor: null,
        },
      }))
      .mockResolvedValueOnce(response({
        data: {
          recordId: "7",
          likeCount: 1,
          users: [{ nickname: "잔잔한파도", avatarUrl: null }],
          nextCursor: null,
        },
      }));
    const { rerender } = render(
      <MusicLikeUsers
        recordId={7}
        likeCount={2}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "2명이 기억했어요" }));
    await screen.findByText("고요한수영");

    rerender(
      <MusicLikeUsers
        recordId={7}
        likeCount={1}
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("고요한수영")).not.toBeInTheDocument());
  });
});
