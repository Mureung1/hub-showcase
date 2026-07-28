import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicMusicDiary } from "./PublicMusicDiary";

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

function record(id: number, title: string, recordDate: string) {
  return {
    id,
    spotifyTrackId: `track-${id}`,
    songTitle: title,
    artistName: "Artist",
    albumName: "Album",
    albumImageUrl: null,
    externalUrl: null,
    emotionText: "오늘의 기억",
    recordDate,
    liked: false,
    likeCount: 0,
    author: { nickname: "잔잔한파도", avatarUrl: null },
  };
}

describe("PublicMusicDiary", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("separates today's record from the past diary", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        todayRecord: record(2, "오늘의 노래", "2026-07-28"),
        records: [record(1, "어제의 노래", "2026-07-27")],
        nextCursor: null,
      },
    }));

    render(
      <PublicMusicDiary
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("음악 다이어리를 펼치는 중...");
    expect(await screen.findByRole("heading", { name: "오늘의 음악" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "오늘의 노래" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "지난 음악 기록" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "어제의 노래" })).toBeInTheDocument();
  });

  it("shows a quiet empty state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: { todayRecord: null, records: [], nextCursor: null },
    }));

    render(
      <PublicMusicDiary
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
      />,
    );

    expect(await screen.findByText("아직 남겨진 음악 기록이 없어요.")).toBeInTheDocument();
  });

  it("retries an initial failure", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        error: { message: "음악 다이어리 조회 중 오류가 발생했습니다." },
      }, false))
      .mockResolvedValueOnce(response({
        data: { todayRecord: null, records: [], nextCursor: null },
      }));

    render(
      <PublicMusicDiary
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "음악 다이어리 조회 중 오류가 발생했습니다.",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("아직 남겨진 음악 기록이 없어요.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("loads another cursor page without duplicate records", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          todayRecord: null,
          records: [record(1, "첫 기록", "2026-07-27")],
          nextCursor: "next-page",
        },
      }))
      .mockResolvedValueOnce(response({
        data: {
          todayRecord: null,
          records: [
            record(1, "첫 기록", "2026-07-27"),
            record(2, "두 번째 기록", "2026-07-26"),
          ],
          nextCursor: null,
        },
      }));

    render(
      <PublicMusicDiary
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "지난 기록 더 보기" }));
    expect(await screen.findByRole("heading", { name: "두 번째 기록" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "첫 기록" })).toHaveLength(1);
    expect(fetch).toHaveBeenLastCalledWith(
      `http://localhost:3000/api/users/${encodeURIComponent("잔잔한파도")}/music-records?cursor=next-page`,
      {
        headers: { Authorization: "Bearer token" },
        signal: undefined,
      },
    );
  });

  it("updates a public diary card only after the like API succeeds", async () => {
    const onLikeChange = vi.fn();
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          todayRecord: record(7, "오늘의 노래", "2026-07-28"),
          records: [],
          nextCursor: null,
        },
      }))
      .mockResolvedValueOnce(response({
        data: { recordId: "7", liked: true, likeCount: 1 },
      }));

    render(
      <PublicMusicDiary
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
        onLikeChange={onLikeChange}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "오늘의 노래 기억하기" }));

    expect(await screen.findByRole("button", { name: "오늘의 노래 기억 취소" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("1명이 기억했어요")).toBeInTheDocument();
    expect(onLikeChange).toHaveBeenCalledWith(7, true, 1);
  });

  it("keeps the public diary state when the like request fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        data: {
          todayRecord: record(7, "오늘의 노래", "2026-07-28"),
          records: [],
          nextCursor: null,
        },
      }))
      .mockResolvedValueOnce(response({
        error: { message: "좋아요 상태 변경 중 오류가 발생했습니다." },
      }, false));

    render(
      <PublicMusicDiary
        nickname="잔잔한파도"
        accessToken="token"
        apiBaseUrl="http://localhost:3000"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "오늘의 노래 기억하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "좋아요 상태 변경 중 오류가 발생했습니다.",
    );
    expect(screen.getByRole("button", { name: "오늘의 노래 기억하기" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
