import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FollowingFeed } from "./FollowingFeed";

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("FollowingFeed", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("renders followed users' records with a Spotify link and no like action", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: [{
        id: 7,
        spotifyTrackId: "track-1",
        songTitle: "Ditto",
        artistName: "NewJeans",
        albumName: "OMG",
        albumImageUrl: "https://example.com/album.jpg",
        externalUrl: "https://open.spotify.com/track/track-1",
        emotionText: "오늘을 천천히 흘려보낸 마음",
        recordDate: "2026-07-27",
        liked: true,
        likeCount: 1,
        author: { nickname: "잔잔한파도", avatarUrl: null },
      }],
      meta: { followingCount: 1 },
    }));

    render(<FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={0} />);

    expect(screen.getByRole("status")).toHaveTextContent("팔로잉의 기록을 불러오는 중");
    expect(await screen.findByText("Ditto")).toBeInTheDocument();
    expect(screen.getByText("잔잔한파도")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spotify에서 열기" })).toHaveAttribute(
      "href",
      "https://open.spotify.com/track/track-1",
    );
    expect(screen.getByRole("button", { name: "Ditto 기억 취소" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/feed", {
      headers: { Authorization: "Bearer valid-token" },
      signal: expect.any(AbortSignal),
    });
  });

  it.each([
    [0, "아직 팔로우한 사람이 없어요."],
    [2, "아직 도착한 음악 기록이 없어요."],
  ])("shows the correct empty state for followingCount %i", async (followingCount, message) => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: [],
      meta: { followingCount },
    }));

    render(<FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={0} />);

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("shows an error and retries", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        error: { message: "피드를 불러올 수 없어요." },
      }, false))
      .mockResolvedValueOnce(response({
        data: [],
        meta: { followingCount: 0 },
      }));

    render(<FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={0} />);

    expect(await screen.findByText("피드를 불러올 수 없어요.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("아직 팔로우한 사람이 없어요.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reloads after the follow state changes", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: [], meta: { followingCount: 0 } }))
      .mockResolvedValueOnce(response({ data: [], meta: { followingCount: 1 } }));
    const { rerender } = render(
      <FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={0} />,
    );
    await screen.findByText("아직 팔로우한 사람이 없어요.");

    rerender(
      <FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={1} />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("아직 도착한 음악 기록이 없어요.")).toBeInTheDocument();
  });

  it("updates only after the like API confirms success", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: [{
          id: 7,
          spotifyTrackId: "track-1",
          songTitle: "Ditto",
          artistName: "NewJeans",
          albumName: "OMG",
          albumImageUrl: null,
          externalUrl: null,
          emotionText: "오늘을 천천히 흘려보낸 마음",
          recordDate: "2026-07-27",
          liked: false,
          likeCount: 0,
          author: { nickname: "잔잔한파도", avatarUrl: null },
        }],
        meta: { followingCount: 1 },
      }))
      .mockResolvedValueOnce(response({
        data: { recordId: "7", liked: true, likeCount: 1 },
      }));
    render(<FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={0} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ditto 기억하기" }));

    expect(await screen.findByRole("button", { name: "Ditto 기억 취소" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("1명이 기억했어요")).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/music-records/7/likes",
      {
        method: "POST",
        headers: { Authorization: "Bearer valid-token" },
      },
    );
  });

  it("keeps the previous state and shows an error when the like request fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: [{
          id: 7,
          spotifyTrackId: "track-1",
          songTitle: "Ditto",
          artistName: "NewJeans",
          albumName: null,
          albumImageUrl: null,
          externalUrl: null,
          emotionText: "오늘의 마음",
          recordDate: "2026-07-27",
          liked: false,
          likeCount: 0,
          author: { nickname: "잔잔한파도", avatarUrl: null },
        }],
        meta: { followingCount: 1 },
      }))
      .mockResolvedValueOnce(response({
        error: { message: "좋아요 상태 변경 중 오류가 발생했습니다." },
      }, false));
    render(<FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={0} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ditto 기억하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "좋아요 상태 변경 중 오류가 발생했습니다.",
    );
    expect(screen.getByRole("button", { name: "Ditto 기억하기" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("disables like actions while a request is pending", async () => {
    let resolveLike: ((value: Response) => void) | undefined;
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: [{
          id: 7,
          spotifyTrackId: "track-1",
          songTitle: "Ditto",
          artistName: "NewJeans",
          albumName: null,
          albumImageUrl: null,
          externalUrl: null,
          emotionText: "오늘의 마음",
          recordDate: "2026-07-27",
          liked: false,
          likeCount: 0,
          author: { nickname: "잔잔한파도", avatarUrl: null },
        }],
        meta: { followingCount: 1 },
      }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {
        resolveLike = resolve;
      }));
    render(<FollowingFeed accessToken="valid-token" apiBaseUrl="http://localhost:3000" refreshKey={0} />);

    const button = await screen.findByRole("button", { name: "Ditto 기억하기" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(2);

    resolveLike?.(response({
      data: { recordId: "7", liked: true, likeCount: 1 },
    }));
    expect(await screen.findByRole("button", { name: "Ditto 기억 취소" })).toBeEnabled();
  });
});
