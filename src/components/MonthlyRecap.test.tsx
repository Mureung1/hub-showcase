import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonthlyRecap } from "./MonthlyRecap";

vi.mock("./SpotifyConnection", () => ({
  SpotifyConnection: ({ onConnectionChange }: { onConnectionChange?: (connected: boolean) => void }) => (
    <button type="button" data-testid="spotify-connection" onClick={() => onConnectionChange?.(true)}>
      mock Spotify connection
    </button>
  ),
}));

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

const julyRecap = {
  year: 2026,
  month: 7,
  recordCount: 3,
  recordDays: 3,
  topArtists: [
    { artistName: "NewJeans", recordCount: 2 },
    { artistName: "아이유", recordCount: 1 },
  ],
  firstRecord: {
    id: 1,
    spotifyTrackId: "track-1",
    songTitle: "Ditto",
    artistName: "NewJeans",
    albumName: "OMG",
    albumImageUrl: "https://example.com/ditto.jpg",
    externalUrl: "https://open.spotify.com/track/track-1",
    emotionText: "조용히 시작한 달",
    recordDate: "2026-07-01",
  },
  lastRecord: {
    id: 3,
    spotifyTrackId: "track-3",
    songTitle: "밤편지",
    artistName: "아이유",
    albumName: "Palette",
    albumImageUrl: "https://example.com/night.jpg",
    externalUrl: null,
    emotionText: "한 달을 천천히 닫는 마음",
    recordDate: "2026-07-31",
  },
  tracks: [
    {
      id: 1,
      spotifyTrackId: "track-1",
      songTitle: "Ditto",
      artistName: "NewJeans",
      albumName: "OMG",
      albumImageUrl: "https://example.com/ditto.jpg",
      externalUrl: "https://open.spotify.com/track/track-1",
      emotionText: "조용히 시작한 달",
      recordDate: "2026-07-01",
    },
    {
      id: 2,
      spotifyTrackId: "track-2",
      songTitle: "Hype Boy",
      artistName: "NewJeans",
      albumName: "New Jeans",
      albumImageUrl: null,
      externalUrl: null,
      emotionText: "가볍게 걷고 싶은 날",
      recordDate: "2026-07-14",
    },
    {
      id: 3,
      spotifyTrackId: "track-3",
      songTitle: "밤편지",
      artistName: "아이유",
      albumName: "Palette",
      albumImageUrl: "https://example.com/night.jpg",
      externalUrl: null,
      emotionText: "한 달을 천천히 닫는 마음",
      recordDate: "2026-07-31",
    },
  ],
};

describe("MonthlyRecap", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("shows the selected month's memories in a calm timeline", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ data: julyRecap }));
    render(
      <MonthlyRecap
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        initialMonth="2026-07"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("한 달의 음악을 모으는 중");
    expect(await screen.findByText("3일의 기억")).toBeInTheDocument();
    expect(screen.getByText("3곡이 이번 달의 마음을 함께했어요.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "이달의 음악 타임라인" })).toBeInTheDocument();
    expect(screen.getAllByText("Ditto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("밤편지").length).toBeGreaterThan(0);
    expect(screen.getByText("2곡").closest("li")).toHaveTextContent("NewJeans");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/recaps/monthly?year=2026&month=7",
      {
        headers: { Authorization: "Bearer valid-token" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("offers playlist export after Spotify connection is confirmed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ data: julyRecap }));
    render(
      <MonthlyRecap
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        initialMonth="2026-07"
      />,
    );
    await screen.findByText("3일의 기억");

    fireEvent.click(screen.getByTestId("spotify-connection"));

    expect(screen.getByRole("button", { name: "비공개 플레이리스트 만들기" })).toBeInTheDocument();
  });

  it("loads a newly selected month", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ data: julyRecap }))
      .mockResolvedValueOnce(response({
        data: {
          ...julyRecap,
          year: 2026,
          month: 6,
          recordCount: 0,
          recordDays: 0,
          topArtists: [],
          firstRecord: null,
          lastRecord: null,
          tracks: [],
        },
      }));
    render(
      <MonthlyRecap
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        initialMonth="2026-07"
      />,
    );
    await screen.findByText("3일의 기억");

    fireEvent.change(screen.getByLabelText("돌아볼 달"), {
      target: { value: "2026-06" },
    });

    expect(await screen.findByText("2026년 6월에는 아직 음악 기록이 없어요.")).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith(
      "http://localhost:3000/api/recaps/monthly?year=2026&month=6",
      expect.objectContaining({
        headers: { Authorization: "Bearer valid-token" },
      }),
    );
  });

  it("shows a quiet empty state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        year: 2026,
        month: 5,
        recordCount: 0,
        recordDays: 0,
        topArtists: [],
        firstRecord: null,
        lastRecord: null,
        tracks: [],
      },
    }));
    render(
      <MonthlyRecap
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        initialMonth="2026-05"
      />,
    );

    expect(await screen.findByText("2026년 5월에는 아직 음악 기록이 없어요.")).toBeInTheDocument();
  });

  it("keeps the selected month and retries after a failure", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({
        error: { message: "월간 기록을 잠시 불러올 수 없어요." },
      }, false))
      .mockResolvedValueOnce(response({ data: julyRecap }));
    render(
      <MonthlyRecap
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        initialMonth="2026-07"
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "월간 기록을 잠시 불러올 수 없어요.",
    );
    expect(screen.getByLabelText("돌아볼 달")).toHaveValue("2026-07");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("3일의 기억")).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it("shows the error state instead of rendering a malformed recap", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        ...julyRecap,
        tracks: [null],
      },
    }));
    render(
      <MonthlyRecap
        apiBaseUrl="http://localhost:3000"
        accessToken="valid-token"
        initialMonth="2026-07"
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "월간 기록 응답을 확인하지 못했어요.",
    );
    expect(screen.queryByRole("heading", { name: "이달의 음악 타임라인" })).not.toBeInTheDocument();
  });
});
