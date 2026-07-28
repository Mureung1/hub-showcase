import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../app.js";

const openServers = [];
const authHeaders = { Authorization: "Bearer valid-access-token" };

afterEach(() => {
  openServers.splice(0).forEach((server) => server.close());
});

async function startApp(options = {}) {
  const server = createApp(options).listen(0);
  openServers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function createAuthClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: { id: "user-1" } }, error: null };
      },
    },
  };
}

function createQuery(result, calls) {
  const query = {
    select(columns) {
      calls.push(["select", columns]);
      return query;
    },
    neq(column, value) {
      calls.push(["neq", column, value]);
      return query;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return query;
    },
    ilike(column, pattern) {
      calls.push(["ilike", column, pattern]);
      return query;
    },
    order(column, options) {
      calls.push(["order", column, options]);
      return Promise.resolve(result);
    },
    maybeSingle() {
      return Promise.resolve({
        data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
        error: result.error,
      });
    },
    then(resolve) {
      return Promise.resolve(result).then(resolve);
    },
  };
  return query;
}

function createDatabase({ profiles = [], follows = [], error = null, calls = [] } = {}) {
  return {
    from(table) {
      calls.push(["from", table]);
      return createQuery(
        table === "profiles"
          ? { data: profiles, error }
          : { data: follows, error },
        calls,
      );
    },
  };
}

function createDiaryDatabase({
  profile = { id: "user-2", nickname: "잔잔한파도", bio: "", avatar_url: null },
  todayRecord = null,
  pastRecords = [],
  nextPastRecords = pastRecords,
  likedRecordIds = [],
  likeCounts = [],
  error = null,
  calls = [],
} = {}) {
  return {
    from(table) {
      calls.push(["from", table]);
      let hasCursorFilter = false;
      const query = {
        select(columns) {
          calls.push(["select", table, columns]);
          return query;
        },
        eq(column, value) {
          calls.push(["eq", table, column, value]);
          return query;
        },
        ilike(column, value) {
          calls.push(["ilike", table, column, value]);
          return query;
        },
        lt(column, value) {
          calls.push(["lt", table, column, value]);
          return query;
        },
        order(column, options) {
          calls.push(["order", table, column, options]);
          return query;
        },
        limit(value) {
          calls.push(["limit", table, value]);
          return query;
        },
        or(filter) {
          hasCursorFilter = true;
          calls.push(["or", table, filter]);
          return query;
        },
        in(column, values) {
          calls.push(["in", table, column, values]);
          return query;
        },
        maybeSingle() {
          if (table === "profiles") {
            return Promise.resolve({ data: profile, error });
          }
          return Promise.resolve({ data: todayRecord, error });
        },
        then(resolve) {
          const data = table === "likes"
            ? likedRecordIds.map((recordId) => ({ record_id: recordId }))
            : table === "music_records"
              ? (hasCursorFilter ? nextPastRecords : pastRecords)
              : [];
          return Promise.resolve({ data, error }).then(resolve);
        },
      };
      return query;
    },
    rpc(name, parameters) {
      calls.push(["rpc", name, parameters]);
      return Promise.resolve({ data: likeCounts, error });
    },
  };
}

describe("users API", () => {
  it("rejects requests without authentication", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/users`);

    assert.equal(response.status, 401);
  });

  it("returns a public profile without internal identifiers", async () => {
    const database = createDatabase({
      profiles: [{ id: "user-2", nickname: "잔잔한파도", bio: "밤의 음악", avatar_url: null }],
      follows: [{ following_id: "user-2" }],
    });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: {
        nickname: "잔잔한파도",
        bio: "밤의 음악",
        avatarUrl: null,
        isMe: false,
        isFollowing: true,
      },
    });
  });

  it("escapes wildcard profile nicknames and keeps case-insensitive exact matching", async () => {
    const calls = [];
    const database = createDatabase({
      profiles: [{ id: "user-2", nickname: "Blue_%", bio: "", avatar_url: null }],
      follows: [],
      calls,
    });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("blue_%")}`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 200);
    assert.ok(calls.some((call) => (
      call[0] === "ilike"
      && call[1] === "nickname"
      && call[2] === "blue\\_\\%"
    )));
  });

  it("returns 404 for a missing public profile", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase(),
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("없는사용자")}`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: {
        code: "USER_NOT_FOUND",
        message: "사용자를 찾을 수 없습니다.",
      },
    });
  });

  it("returns a profile-specific error when detail lookup fails", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        error: new Error("database unavailable"),
      }),
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "프로필 조회 중 오류가 발생했습니다.",
      },
    });
  });

  it("returns today's record and a 20-record public diary page without auth IDs", async () => {
    const calls = [];
    const pastRecords = Array.from({ length: 21 }, (_, index) => ({
      id: index + 1,
      spotify_track_id: `track-${index + 1}`,
      song_title: `지난 노래 ${index + 1}`,
      artist_name: "Artist",
      album_name: null,
      album_image_url: null,
      external_url: null,
      emotion_text: "지난 기억",
      record_date: "2026-07-27",
      created_at: "2026-07-27T00:00:00Z",
    }));
    const database = createDiaryDatabase({
      todayRecord: {
        id: 30,
        spotify_track_id: "today-track",
        song_title: "오늘의 노래",
        artist_name: "Today Artist",
        album_name: "Today Album",
        album_image_url: null,
        external_url: null,
        emotion_text: "오늘의 기억",
        record_date: "2026-07-28",
        created_at: "2026-07-28T00:00:00Z",
      },
      pastRecords,
      likedRecordIds: [30],
      likeCounts: [
        { record_id: 30, like_count: 2 },
        { record_id: 1, like_count: 1 },
      ],
      calls,
    });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
      getCurrentDate: () => "2026-07-28",
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}/music-records`,
      { headers: authHeaders },
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.todayRecord.songTitle, "오늘의 노래");
    assert.equal(body.data.todayRecord.liked, true);
    assert.equal(body.data.todayRecord.likeCount, 2);
    assert.equal(body.data.records.length, 20);
    assert.equal(typeof body.data.nextCursor, "string");
    assert.equal(Object.hasOwn(body.data.todayRecord, "userId"), false);
    assert.equal(Object.hasOwn(body.data.todayRecord.author, "id"), false);
    assert.ok(calls.some((call) => (
      call[0] === "lt"
      && call[1] === "music_records"
      && call[2] === "record_date"
      && call[3] === "2026-07-28"
    )));
    assert.ok(calls.some((call) => (
      call[0] === "limit"
      && call[1] === "music_records"
      && call[2] === 21
    )));
  });

  it("rejects an invalid public diary cursor", async () => {
    const database = createDiaryDatabase();
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
      getCurrentDate: () => "2026-07-28",
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}/music-records?cursor=invalid`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INVALID_CURSOR",
        message: "페이지 정보를 확인해 주세요.",
      },
    });
  });

  it("uses the last visible record as a stable keyset after newer records are inserted", async () => {
    const calls = [];
    const makePastRecord = (id) => ({
      id,
      spotify_track_id: `track-${id}`,
      song_title: `지난 노래 ${id}`,
      artist_name: "Artist",
      album_name: null,
      album_image_url: null,
      external_url: null,
      emotion_text: "지난 기억",
      record_date: "2026-07-27",
      created_at: "2026-07-27T10:00:00.000Z",
    });
    const firstPageRows = Array.from({ length: 21 }, (_, index) => (
      makePastRecord(100 - index)
    ));
    const database = createDiaryDatabase({
      pastRecords: firstPageRows,
      nextPastRecords: [makePastRecord(80)],
      calls,
    });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
      getCurrentDate: () => "2026-07-28",
    });

    const firstResponse = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}/music-records`,
      { headers: authHeaders },
    );
    const cursor = (await firstResponse.json()).data.nextCursor;

    const secondResponse = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}/music-records?cursor=${encodeURIComponent(cursor)}`,
      { headers: authHeaders },
    );
    const secondBody = await secondResponse.json();

    assert.equal(secondResponse.status, 200);
    assert.deepEqual(secondBody.data.records.map((record) => record.id), [80]);
    assert.ok(calls.some((call) => (
      call[0] === "or"
      && call[1] === "music_records"
      && call[2].includes("record_date.lt.2026-07-27")
      && call[2].includes("created_at.lt.2026-07-27T10:00:00.000Z")
      && call[2].includes("id.lt.81")
    )));
  });

  it("returns 404 when the public diary owner does not exist", async () => {
    const database = createDiaryDatabase({ profile: null });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
      getCurrentDate: () => "2026-07-28",
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("없는사용자")}/music-records`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 404);
  });

  it("rejects an unauthenticated public diary request", async () => {
    const baseUrl = await startApp();
    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}/music-records`,
    );

    assert.equal(response.status, 401);
  });

  it("returns a stable error when the public diary lookup fails", async () => {
    const database = createDiaryDatabase({ error: new Error("database unavailable") });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
      getCurrentDate: () => "2026-07-28",
    });

    const response = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("잔잔한파도")}/music-records`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "음악 다이어리 조회 중 오류가 발생했습니다.",
      },
    });
  });

  it("returns other users with the current follow state", async () => {
    const calls = [];
    const database = createDatabase({
      profiles: [
        { id: "user-2", nickname: "잔잔한파도", bio: "밤의 음악", avatar_url: null },
        { id: "user-3", nickname: "푸른기억", bio: "", avatar_url: "https://example.com/avatar.jpg" },
      ],
      follows: [{ following_id: "user-2" }],
      calls,
    });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(`${baseUrl}/api/users`, { headers: authHeaders });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [
        { nickname: "잔잔한파도", bio: "밤의 음악", avatarUrl: null, isFollowing: true },
        { nickname: "푸른기억", bio: "", avatarUrl: "https://example.com/avatar.jpg", isFollowing: false },
      ],
    });
    const responseBody = await (await fetch(`${baseUrl}/api/users`, { headers: authHeaders })).json();
    assert.equal(Object.hasOwn(responseBody.data[0], "id"), false);
    assert.equal(Object.hasOwn(responseBody.data[0], "email"), false);
    assert.ok(calls.some((call) => call[0] === "neq" && call[1] === "id" && call[2] === "user-1"));
    assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "follower_id" && call[2] === "user-1"));
  });

  it("returns an empty list when there are no other users", async () => {
    const database = createDatabase();
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(`${baseUrl}/api/users`, { headers: authHeaders });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [] });
  });

  it("trims q and filters nicknames case-insensitively while preserving follow state", async () => {
    const calls = [];
    const database = createDatabase({
      profiles: [
        { id: "user-2", nickname: "BlueWave", bio: "", avatar_url: null },
      ],
      follows: [{ following_id: "user-2" }],
      calls,
    });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(`${baseUrl}/api/users?q=%20blue%20`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [
        { nickname: "BlueWave", bio: "", avatarUrl: null, isFollowing: true },
      ],
    });
    assert.ok(calls.some((call) => (
      call[0] === "ilike"
      && call[1] === "nickname"
      && call[2] === "%blue%"
    )));
    assert.ok(calls.some((call) => (
      call[0] === "neq"
      && call[1] === "id"
      && call[2] === "user-1"
    )));
  });

  it("rejects a search query shorter than two trimmed characters", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => {
        throw new Error("database should not be called");
      },
    });

    const response = await fetch(`${baseUrl}/api/users?q=%20a%20`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INVALID_SEARCH_QUERY",
        message: "검색어는 2자 이상 입력해 주세요.",
      },
    });
  });

  it("returns a stable error when the database lookup fails", async () => {
    const database = createDatabase({ error: new Error("database unavailable") });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(`${baseUrl}/api/users`, { headers: authHeaders });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "사용자 목록 조회 중 오류가 발생했습니다.",
      },
    });
  });
});
