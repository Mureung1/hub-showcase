import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../app.js";

const openServers = [];

afterEach(() => {
  openServers.splice(0).forEach((server) => server.close());
});

async function startApp(options = {}) {
  const server = createApp(options).listen(0);
  openServers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

describe("Spotify search API", () => {
  it("rejects a missing q query", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/spotify/search`);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "검색어를 입력해주세요." });
  });

  it("rejects an empty q query", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/spotify/search?q=`);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "검색어를 입력해주세요." });
  });

  it("rejects a whitespace-only q query", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/spotify/search?q=%20%20%20`);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "검색어를 입력해주세요." });
  });

  it("rejects a q query shorter than 2 characters", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/spotify/search?q=a`);

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: "검색어는 2글자 이상 입력해주세요." });
  });

  it("returns search results for a valid q query", async () => {
    const spotifyResults = [
      {
        spotifyTrackId: "track-1",
        title: "Ditto",
        artistName: "NewJeans",
        albumName: "OMG",
        albumImageUrl: "https://example.com/album.jpg",
        externalUrl: "https://open.spotify.com/track/track-1",
      },
    ];
    const calls = [];
    const baseUrl = await startApp({
      searchSpotifyTracks: async (query) => {
        calls.push(query);
        return spotifyResults;
      },
    });

    const response = await fetch(`${baseUrl}/api/spotify/search?q=%20ditto%20`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), spotifyResults);
    assert.deepEqual(calls, ["ditto"]);
  });

  it("returns a stable error response when Spotify search fails", async () => {
    const baseUrl = await startApp({
      searchSpotifyTracks: async () => {
        throw new Error("Spotify unavailable");
      },
    });

    const response = await fetch(`${baseUrl}/api/spotify/search?q=ditto`);

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      message: "음악 검색 중 오류가 발생했습니다.",
    });
  });
});
