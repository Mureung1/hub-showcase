import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotifyPlaylistExport } from "./SpotifyPlaylistExport";

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("SpotifyPlaylistExport", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("creates the selected month's playlist and shows its Spotify link", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      data: {
        year: 2026,
        month: 7,
        playlistUrl: "https://open.spotify.com/playlist/playlist-1",
        trackCount: 2,
        reused: false,
      },
    }));
    render(
      <SpotifyPlaylistExport
        apiBaseUrl="http://localhost:3000"
        accessToken="token"
        year={2026}
        month={7}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "비공개 플레이리스트 만들기" }));
    const link = await screen.findByRole("link", { name: "Spotify에서 2곡 열기" });
    expect(link).toHaveAttribute("href", "https://open.spotify.com/playlist/playlist-1");
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/spotify/playlists", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ year: 2026, month: 7 }),
    });
  });

  it("keeps the export action available after a failed request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({
      error: { message: "Spotify 요청이 많아요." },
    }, false));
    render(
      <SpotifyPlaylistExport
        apiBaseUrl="http://localhost:3000"
        accessToken="token"
        year={2026}
        month={7}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "비공개 플레이리스트 만들기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Spotify 요청이 많아요.");
    expect(screen.getByRole("button", { name: "비공개 플레이리스트 만들기" })).toBeEnabled();
  });
});
