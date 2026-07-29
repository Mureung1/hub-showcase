import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../app.js";
import { SpotifyPlaylistExportError } from "../services/spotifyPlaylistService.js";

const servers = [];
const headers = {
  Authorization: "Bearer token",
  "Content-Type": "application/json",
};

afterEach(() => servers.splice(0).forEach((server) => server.close()));

async function startApp(exportMonthlyRecapPlaylist) {
  const server = createApp({
    getSupabase: () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
    }),
    getAdminSupabase: () => ({ kind: "admin" }),
    getAuthenticatedSupabase: (token) => ({ kind: "user", token }),
    exportMonthlyRecapPlaylist,
  }).listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

describe("Spotify playlist export API", () => {
  it("rejects unauthenticated and invalid month requests", async () => {
    const baseUrl = await startApp(async () => assert.fail("must not export"));
    assert.equal((await fetch(`${baseUrl}/api/spotify/playlists`, { method: "POST" })).status, 401);

    for (const body of [{}, { year: 2026, month: 0 }, { year: "2026", month: 7 }]) {
      const response = await fetch(`${baseUrl}/api/spotify/playlists`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
    }
  });

  it("exports only the authenticated user's selected month", async () => {
    const calls = [];
    const baseUrl = await startApp(async (...args) => {
      calls.push(args);
      return {
        year: 2026,
        month: 7,
        playlistUrl: "https://open.spotify.com/playlist/playlist-1",
        trackCount: 2,
        reused: false,
      };
    });
    const response = await fetch(`${baseUrl}/api/spotify/playlists`, {
      method: "POST",
      headers,
      body: JSON.stringify({ year: 2026, month: 7 }),
    });

    assert.equal(response.status, 201);
    assert.equal(calls[0][2], "user-1");
    assert.equal(calls[0][3], 2026);
    assert.equal(calls[0][4], 7);
    assert.equal(calls[0][1].token, "token");
    assert.equal((await response.json()).data.playlistUrl, "https://open.spotify.com/playlist/playlist-1");
  });

  it("returns an existing export and maps Spotify rate limits", async () => {
    const reusedUrl = await startApp(async () => ({
      year: 2026,
      month: 7,
      playlistUrl: "https://open.spotify.com/playlist/existing",
      trackCount: 2,
      reused: true,
    }));
    const reused = await fetch(`${reusedUrl}/api/spotify/playlists`, {
      method: "POST",
      headers,
      body: JSON.stringify({ year: 2026, month: 7 }),
    });
    assert.equal(reused.status, 200);
    assert.equal((await reused.json()).data.reused, true);

    const limitedUrl = await startApp(async () => {
      throw new SpotifyPlaylistExportError("잠시 후 다시 시도해 주세요.", "SPOTIFY_RATE_LIMITED", 429, "8");
    });
    const limited = await fetch(`${limitedUrl}/api/spotify/playlists`, {
      method: "POST",
      headers,
      body: JSON.stringify({ year: 2026, month: 7 }),
    });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "8");
    assert.equal((await limited.json()).error.code, "SPOTIFY_RATE_LIMITED");
  });
});
