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

function createSupabaseQuery(result, calls = []) {
  const query = {
    from(table) {
      calls.push(["from", table]);
      return query;
    },
    select(columns) {
      calls.push(["select", columns]);
      return query;
    },
    order(column, options) {
      calls.push(["order", column, options]);
      return query;
    },
    insert(values) {
      calls.push(["insert", values]);
      return query;
    },
    single() {
      calls.push(["single"]);
      return Promise.resolve(result);
    },
    then(resolve) {
      return Promise.resolve(result).then(resolve);
    },
  };
  return query;
}

const databaseRecord = {
  id: 1,
  spotify_track_id: "spotify-track-1",
  song_title: "Ditto",
  artist_name: "NewJeans",
  album_name: "OMG",
  album_image_url: "https://example.com/album.jpg",
  external_url: "https://open.spotify.com/track/spotify-track-1",
  emotion_text: "오늘 하루를 위로받은 기분",
  record_date: "2026-07-16",
  created_at: "2026-07-16T10:30:00.000Z",
};

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

describe("SWIM API", () => {
  it("returns the health status", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("returns ordered camelCase music records", async () => {
    const calls = [];
    const query = createSupabaseQuery({ data: [databaseRecord], error: null }, calls);
    const baseUrl = await startApp({ getSupabase: () => query });

    const response = await fetch(`${baseUrl}/api/music-records`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [apiRecord] });
    assert.deepEqual(calls.filter(([name]) => name === "order"), [
      ["order", "record_date", { ascending: false }],
      ["order", "created_at", { ascending: false }],
    ]);
  });

  it("returns an empty data array", async () => {
    const query = createSupabaseQuery({ data: [], error: null });
    const baseUrl = await startApp({ getSupabase: () => query });
    const response = await fetch(`${baseUrl}/api/music-records`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [] });
  });

  it("creates a trimmed Spotify-backed record with the server date", async () => {
    const calls = [];
    const query = createSupabaseQuery({ data: databaseRecord, error: null }, calls);
    const baseUrl = await startApp({
      getSupabase: () => query,
      getCurrentDate: () => "2026-07-16",
    });

    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spotifyTrackId: " spotify-track-1 ",
        songTitle: "  Ditto  ",
        artistName: " NewJeans ",
        albumName: " OMG ",
        albumImageUrl: " https://example.com/album.jpg ",
        externalUrl: " https://open.spotify.com/track/spotify-track-1 ",
        emotionText: " 오늘 하루를 위로받은 기분 ",
      }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { data: apiRecord });
    assert.deepEqual(calls.find(([name]) => name === "insert"), ["insert", {
      spotify_track_id: "spotify-track-1",
      song_title: "Ditto",
      artist_name: "NewJeans",
      album_name: "OMG",
      album_image_url: "https://example.com/album.jpg",
      external_url: "https://open.spotify.com/track/spotify-track-1",
      emotion_text: "오늘 하루를 위로받은 기분",
      record_date: "2026-07-16",
    }]);
  });

  it("rejects empty required values", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songTitle: " ", artistName: "NewJeans", emotionText: "하루" }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: "INVALID_INPUT", message: "필수 입력값을 확인해주세요." },
    });
  });

  it("returns the stable internal error response for a failed insert", async () => {
    const query = createSupabaseQuery({ data: null, error: new Error("database unavailable") });
    const baseUrl = await startApp({ getSupabase: () => query });
    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songTitle: "Ditto", artistName: "NewJeans", emotionText: "하루" }),
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "음악 기록 저장 중 오류가 발생했습니다.",
      },
    });
  });
});
