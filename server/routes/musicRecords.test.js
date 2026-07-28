import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../app.js";

const openServers = [];
const authenticatedUser = { id: "user-1", email: "swimmer@example.com" };
const authHeaders = {
  Authorization: "Bearer valid-access-token",
};

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

function createAuthClient({ user = authenticatedUser, error = null, calls = [] } = {}) {
  return {
    auth: {
      async getUser(accessToken) {
        calls.push(["getUser", accessToken]);
        return { data: { user }, error };
      },
    },
  };
}

function createSupabaseQuery(
  result,
  calls = [],
  likesResult = { data: [], error: null },
  likeCountsResult = { data: [{ record_id: 1, like_count: 0 }], error: null },
) {
  let activeTable = "";
  const query = {
    from(table) {
      calls.push(["from", table]);
      activeTable = table;
      return query;
    },
    rpc(name, parameters) {
      calls.push(["rpc", name, parameters]);
      return Promise.resolve(likeCountsResult);
    },
    select(columns) {
      calls.push(["select", columns]);
      return query;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return query;
    },
    in(column, values) {
      calls.push(["in", column, values]);
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
      const activeResult = activeTable === "likes" ? likesResult : result;
      return Promise.resolve(activeResult).then(resolve);
    },
  };
  return query;
}

const databaseRecord = {
  id: 1,
  user_id: "user-1",
  spotify_track_id: "spotify-track-1",
  song_title: "Ditto",
  artist_name: "NewJeans",
  album_name: "OMG",
  album_image_url: "https://example.com/album.jpg",
  external_url: "https://open.spotify.com/track/spotify-track-1",
  emotion_text: "오늘 하루를 위로받은 기분",
  record_date: "2026-07-16",
  created_at: "2026-07-16T10:30:00.000Z",
  author: {
    id: "user-1",
    nickname: "고요한수영",
    avatar_url: null,
  },
};

const apiRecord = {
  id: 1,
  userId: "user-1",
  spotifyTrackId: "spotify-track-1",
  songTitle: "Ditto",
  artistName: "NewJeans",
  albumName: "OMG",
  albumImageUrl: "https://example.com/album.jpg",
  externalUrl: "https://open.spotify.com/track/spotify-track-1",
  emotionText: "오늘 하루를 위로받은 기분",
  recordDate: "2026-07-16",
  createdAt: "2026-07-16T10:30:00.000Z",
  liked: false,
  likeCount: 0,
  author: {
    id: "user-1",
    nickname: "고요한수영",
    avatarUrl: null,
  },
};

function createAuthenticatedOptions(query, authCalls = []) {
  return {
    getSupabase: () => createAuthClient({ calls: authCalls }),
    getAuthenticatedSupabase: () => query,
  };
}

describe("SWIM API", () => {
  it("returns the health status", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("rejects a music record request without a bearer token", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songTitle: "Ditto", artistName: "NewJeans", emotionText: "하루" }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
    });
  });

  it("rejects an invalid bearer token", async () => {
    const authCalls = [];
    const baseUrl = await startApp({
      getSupabase: () => createAuthClient({
        user: null,
        error: new Error("invalid token"),
        calls: authCalls,
      }),
    });
    const response = await fetch(`${baseUrl}/api/music-records`, { headers: authHeaders });

    assert.equal(response.status, 401);
    assert.deepEqual(authCalls, [["getUser", "valid-access-token"]]);
  });

  it("returns only the authenticated user's ordered music records with author data", async () => {
    const calls = [];
    const query = createSupabaseQuery({ data: [databaseRecord], error: null }, calls);
    const baseUrl = await startApp(createAuthenticatedOptions(query));

    const response = await fetch(`${baseUrl}/api/music-records`, { headers: authHeaders });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [apiRecord] });
    assert.deepEqual(calls.find(([name]) => name === "eq"), ["eq", "user_id", "user-1"]);
    assert.deepEqual(calls.filter(([name]) => name === "order"), [
      ["order", "record_date", { ascending: false }],
      ["order", "created_at", { ascending: false }],
    ]);
  });

  it("includes only the authenticated user's persisted like state", async () => {
    const calls = [];
    const query = createSupabaseQuery(
      { data: [databaseRecord], error: null },
      calls,
      { data: [{ record_id: 1 }], error: null },
      { data: [{ record_id: 1, like_count: 3 }], error: null },
    );
    const baseUrl = await startApp(createAuthenticatedOptions(query));

    const response = await fetch(`${baseUrl}/api/music-records`, { headers: authHeaders });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data[0].liked, true);
    assert.equal(body.data[0].likeCount, 3);
    assert.deepEqual(
      calls.filter(([name, column]) => name === "eq" && column === "user_id").at(-1),
      ["eq", "user_id", "user-1"],
    );
    assert.ok(calls.some((call) => (
      call[0] === "in"
      && call[1] === "record_id"
      && JSON.stringify(call[2]) === JSON.stringify([1])
    )));
  });

  it("returns an empty data array for an authenticated user without records", async () => {
    const query = createSupabaseQuery({ data: [], error: null });
    const baseUrl = await startApp(createAuthenticatedOptions(query));
    const response = await fetch(`${baseUrl}/api/music-records`, { headers: authHeaders });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [] });
  });

  it("does not return a partial record response when aggregate lookup fails", async () => {
    const query = createSupabaseQuery(
      { data: [databaseRecord], error: null },
      [],
      { data: [], error: null },
      { data: null, error: new Error("aggregate unavailable") },
    );
    const baseUrl = await startApp(createAuthenticatedOptions(query));
    const response = await fetch(`${baseUrl}/api/music-records`, { headers: authHeaders });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "음악 기록 조회 중 오류가 발생했습니다.",
      },
    });
  });

  it("creates a trimmed record using only the authenticated user's id", async () => {
    const calls = [];
    const query = createSupabaseQuery({ data: databaseRecord, error: null }, calls);
    const baseUrl = await startApp({
      ...createAuthenticatedOptions(query),
      getCurrentDate: () => "2026-07-16",
    });

    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "other-user",
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
      user_id: "user-1",
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

  it("rejects empty required values after authentication", async () => {
    const query = createSupabaseQuery({ data: [], error: null });
    const baseUrl = await startApp(createAuthenticatedOptions(query));
    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ songTitle: " ", artistName: "NewJeans", emotionText: "하루" }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: "INVALID_INPUT", message: "필수 입력값을 확인해주세요." },
    });
  });

  it("returns 409 when the user already recorded music today", async () => {
    const duplicateError = Object.assign(new Error("duplicate key"), { code: "23505" });
    const query = createSupabaseQuery({ data: null, error: duplicateError });
    const baseUrl = await startApp({
      ...createAuthenticatedOptions(query),
      getCurrentDate: () => "2026-07-16",
    });

    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        songTitle: "Ditto",
        artistName: "NewJeans",
        emotionText: "하루",
      }),
    });

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: {
        code: "MUSIC_RECORD_ALREADY_EXISTS",
        message: "오늘의 음악 기록은 이미 남겼어요.",
      },
    });
  });

  it("returns the stable internal error response for a failed insert", async () => {
    const query = createSupabaseQuery({ data: null, error: new Error("database unavailable") });
    const baseUrl = await startApp(createAuthenticatedOptions(query));
    const response = await fetch(`${baseUrl}/api/music-records`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
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
