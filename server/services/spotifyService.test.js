import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapSpotifyTrack, searchSpotifyTracks } from "./spotifyService.js";

const spotifyTrack = {
  id: "track-1",
  name: "Ditto",
  artists: [{ name: "NewJeans" }, { name: "Artist 2" }],
  album: {
    name: "OMG",
    images: [
      { url: "https://example.com/large.jpg", width: 640 },
      { url: "https://example.com/small.jpg", width: 300 },
    ],
  },
  external_urls: {
    spotify: "https://open.spotify.com/track/track-1",
  },
};

describe("spotifyService", () => {
  it("maps Spotify tracks to the frontend response shape", () => {
    assert.deepEqual(mapSpotifyTrack(spotifyTrack), {
      spotifyTrackId: "track-1",
      title: "Ditto",
      artistName: "NewJeans, Artist 2",
      albumName: "OMG",
      albumImageUrl: "https://example.com/large.jpg",
      externalUrl: "https://open.spotify.com/track/track-1",
    });
  });

  it("calls Spotify Search API with track type and limit 10", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({ tracks: { items: [spotifyTrack] } }),
      };
    };

    const result = await searchSpotifyTracks("ditto", {
      fetchImpl,
      getAccessToken: async () => "access-token",
    });

    const searchUrl = new URL(calls[0].url);
    assert.equal(searchUrl.origin + searchUrl.pathname, "https://api.spotify.com/v1/search");
    assert.equal(searchUrl.searchParams.get("q"), "ditto");
    assert.equal(searchUrl.searchParams.get("type"), "track");
    assert.equal(searchUrl.searchParams.get("limit"), "10");
    assert.deepEqual(calls[0].options, {
      headers: { Authorization: "Bearer access-token" },
    });
    assert.equal(result.length, 1);
    assert.equal(result[0].spotifyTrackId, "track-1");
  });

  it("throws when Spotify Search API fails", async () => {
    await assert.rejects(
      searchSpotifyTracks("ditto", {
        fetchImpl: async () => ({ ok: false, status: 500 }),
        getAccessToken: async () => "access-token",
      }),
      /Spotify search failed/,
    );
  });

  it("throws when Spotify response shape is invalid", async () => {
    await assert.rejects(
      searchSpotifyTracks("ditto", {
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ tracks: null }),
        }),
        getAccessToken: async () => "access-token",
      }),
      /Invalid Spotify search response/,
    );
  });
});
