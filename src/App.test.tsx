import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const apiRecord = {
  id: 1,
  spotifyTrackId: "spotify-track-1",
  songTitle: "Ditto",
  artistName: "NewJeans",
  albumName: "OMG",
  albumImageUrl: "https://example.com/album.jpg",
  externalUrl: "https://open.spotify.com/track/spotify-track-1",
  emotionText: "오늘 하루를 위로받은 기분",
  recordDate: "2026-07-16",
  createdAt: "2026-07-16T10:30:00.000Z",
};

const spotifyTrack = {
  spotifyTrackId: "spotify-track-1",
  title: "Ditto",
  artistName: "NewJeans",
  albumName: "OMG",
  albumImageUrl: "https://example.com/album.jpg",
  externalUrl: "https://open.spotify.com/track/spotify-track-1",
};

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

async function searchAndSelectTrack() {
  fireEvent.change(screen.getByLabelText("노래 검색"), { target: { value: "ditto" } });

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/spotify/search?q=ditto",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  fireEvent.click(await screen.findByRole("option", { name: /Ditto/i }));
}

describe("music record API flow", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("shows today without a date input", () => {
    render(<App initialRecords={[]} initialView="diary" />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument();
  });

  it("loads persisted records with GET on first render", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ data: [apiRecord] }));
    render(<App initialView="diary" />);
    expect(await screen.findByRole("heading", { name: "Ditto" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/music-records");
  });

  it("searches Spotify through the Express API and selects a track", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response([spotifyTrack]));
    render(<App initialRecords={[]} initialView="diary" />);

    await searchAndSelectTrack();

    expect(screen.getByText("NewJeans")).toBeInTheDocument();
    expect(screen.getByText("OMG")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변경" })).toBeInTheDocument();
  });

  it("posts a Spotify-backed record and refreshes the list with GET", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response([spotifyTrack]))
      .mockResolvedValueOnce(response({ data: apiRecord }, true, 201))
      .mockResolvedValueOnce(response({ data: [apiRecord] }));
    render(<App initialRecords={[]} initialView="diary" />);

    await searchAndSelectTrack();
    fireEvent.change(screen.getByLabelText("한 줄로 남기기"), {
      target: { value: "오늘 하루를 위로받은 기분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));

    expect(await screen.findByRole("heading", { name: "Ditto" })).toBeInTheDocument();
    expect(fetch).toHaveBeenNthCalledWith(2, "http://localhost:3000/api/music-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spotifyTrackId: "spotify-track-1",
        songTitle: "Ditto",
        artistName: "NewJeans",
        albumName: "OMG",
        albumImageUrl: "https://example.com/album.jpg",
        externalUrl: "https://open.spotify.com/track/spotify-track-1",
        emotionText: "오늘 하루를 위로받은 기분",
      }),
    });
    expect(fetch).toHaveBeenNthCalledWith(3, "http://localhost:3000/api/music-records");
  });

  it("shows a server error without using alert", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response([spotifyTrack]))
      .mockResolvedValueOnce(response({
        error: { code: "INTERNAL_SERVER_ERROR", message: "음악 기록 저장 중 오류가 발생했습니다." },
      }, false, 500));
    render(<App initialRecords={[]} initialView="diary" />);

    await searchAndSelectTrack();
    fireEvent.change(screen.getByLabelText("한 줄로 남기기"), {
      target: { value: "오늘 하루를 위로받은 기분" },
    });
    fireEvent.click(screen.getByRole("button", { name: "기록하기" }));

    await waitFor(() => {
      expect(screen.getByText("음악 기록 저장 중 오류가 발생했습니다.")).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Ditto" })).not.toBeInTheDocument();
  });
});
