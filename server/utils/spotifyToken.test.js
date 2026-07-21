import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { clearSpotifyTokenCache, getSpotifyAccessToken } from "./spotifyToken.js";

const originalClientId = process.env.SPOTIFY_CLIENT_ID;
const originalClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

afterEach(() => {
  process.env.SPOTIFY_CLIENT_ID = originalClientId;
  process.env.SPOTIFY_CLIENT_SECRET = originalClientSecret;
  clearSpotifyTokenCache();
});

describe("spotifyToken", () => {
  it("requests and caches a Spotify access token", async () => {
    process.env.SPOTIFY_CLIENT_ID = "client-id";
    process.env.SPOTIFY_CLIENT_SECRET = "client-secret";
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ access_token: "token-1", expires_in: 3600 }),
      };
    };

    const firstToken = await getSpotifyAccessToken({ fetchImpl, now: () => 1000 });
    const secondToken = await getSpotifyAccessToken({ fetchImpl, now: () => 2000 });

    assert.equal(firstToken, "token-1");
    assert.equal(secondToken, "token-1");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://accounts.spotify.com/api/token");
    assert.equal(calls[0].options.method, "POST");
  });

  it("throws when Spotify authentication fails", async () => {
    process.env.SPOTIFY_CLIENT_ID = "client-id";
    process.env.SPOTIFY_CLIENT_SECRET = "client-secret";

    await assert.rejects(
      getSpotifyAccessToken({
        fetchImpl: async () => ({ ok: false, status: 401 }),
      }),
      /Spotify authentication failed/,
    );
  });

  it("throws when credentials are missing", async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_SECRET;

    await assert.rejects(
      getSpotifyAccessToken({
        fetchImpl: async () => ({ ok: true }),
      }),
      /Missing Spotify client credentials/,
    );
  });
});
