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

function createDatabase({
  record = { id: 7 },
  recordError = null,
  mutationError = null,
  likeCount = 1,
  likeCountError = null,
  likeUsers = [],
  likeUsersError = null,
  calls = [],
} = {}) {
  return {
    rpc(name, parameters) {
      calls.push(["rpc", name, parameters]);
      if (name === "get_music_record_like_users") {
        return Promise.resolve({ data: likeUsers, error: likeUsersError });
      }
      return Promise.resolve({
        data: [{ record_id: parameters.p_record_ids[0], like_count: likeCount }],
        error: likeCountError,
      });
    },
    from(table) {
      calls.push(["from", table]);
      const query = {
        select(columns) {
          calls.push(["select", table, columns]);
          return query;
        },
        eq(column, value) {
          calls.push(["eq", table, column, value]);
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: record, error: recordError });
        },
        upsert(values, options) {
          calls.push(["upsert", values, options]);
          return Promise.resolve({ data: null, error: mutationError });
        },
        delete() {
          calls.push(["delete"]);
          return query;
        },
        then(resolve) {
          return Promise.resolve({ data: null, error: mutationError }).then(resolve);
        },
      };
      return query;
    },
  };
}

describe("music record likes API", () => {
  it("rejects unauthenticated requests", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      method: "POST",
    });

    assert.equal(response.status, 401);
  });

  it("returns only public profile fields with a 20-user cursor page", async () => {
    const calls = [];
    const likeUsers = Array.from({ length: 21 }, (_, index) => ({
      nickname: `기억한사람${String(index + 1).padStart(2, "0")}`,
      avatar_url: index === 0 ? "https://example.com/avatar.jpg" : null,
      liked_at: `2026-07-27T${String(23 - index).padStart(2, "0")}:00:00.000Z`,
      user_id: `hidden-user-${index}`,
      email: `hidden-${index}@example.com`,
    }));
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        calls,
        likeUsers,
        likeCount: 21,
      }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      headers: authHeaders,
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.recordId, "7");
    assert.equal(body.data.likeCount, 21);
    assert.equal(body.data.users.length, 20);
    assert.deepEqual(body.data.users[0], {
      nickname: "기억한사람01",
      avatarUrl: "https://example.com/avatar.jpg",
    });
    assert.equal(typeof body.data.nextCursor, "string");
    assert.equal(JSON.stringify(body).includes("hidden-user"), false);
    assert.equal(JSON.stringify(body).includes("@example.com"), false);
    assert.ok(calls.some((call) => (
      call[0] === "rpc"
      && call[1] === "get_music_record_like_users"
      && call[2].p_limit === 21
    )));
  });

  it("passes a valid public cursor to the next page query", async () => {
    const firstDatabase = createDatabase({
      likeUsers: Array.from({ length: 21 }, (_, index) => ({
        nickname: `기억한사람${String(index + 1).padStart(2, "0")}`,
        avatar_url: null,
        liked_at: `2026-07-27T${String(23 - index).padStart(2, "0")}:00:00.000Z`,
      })),
      likeCount: 21,
    });
    const firstBaseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => firstDatabase,
    });
    const firstResponse = await fetch(`${firstBaseUrl}/api/music-records/7/likes`, {
      headers: authHeaders,
    });
    const cursor = (await firstResponse.json()).data.nextCursor;

    const calls = [];
    const secondBaseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        calls,
        likeUsers: [{
          nickname: "마지막사람",
          avatar_url: null,
          liked_at: "2026-07-26T00:00:00.000Z",
        }],
        likeCount: 21,
      }),
    });
    const secondResponse = await fetch(
      `${secondBaseUrl}/api/music-records/7/likes?cursor=${encodeURIComponent(cursor)}`,
      { headers: authHeaders },
    );

    assert.equal(secondResponse.status, 200);
    assert.equal((await secondResponse.json()).data.nextCursor, null);
    const listCall = calls.find((call) => (
      call[0] === "rpc" && call[1] === "get_music_record_like_users"
    ));
    assert.equal(typeof listCall[2].p_cursor_nickname, "string");
    assert.equal(listCall[2].p_cursor_nickname, "기억한사람20");
  });

  it("rejects an invalid cursor", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase(),
    });
    const response = await fetch(
      `${baseUrl}/api/music-records/7/likes?cursor=not-a-cursor`,
      { headers: authHeaders },
    );

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_LIKE_CURSOR");
  });

  it("returns 404 when a like-user list record is missing or inaccessible", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({ record: null }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "MUSIC_RECORD_NOT_FOUND");
  });

  it("returns a stable error when the public user list lookup fails", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        likeUsersError: new Error("user list unavailable"),
      }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "좋아요 사용자 목록 조회 중 오류가 발생했습니다.",
      },
    });
  });

  it("rejects malformed and out-of-range record IDs before querying the database", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => {
        throw new Error("database should not be called");
      },
    });

    for (const recordId of ["abc", "0", "9223372036854775808"]) {
      const response = await fetch(
        `${baseUrl}/api/music-records/${recordId}/likes`,
        { method: "POST", headers: authHeaders },
      );
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, "INVALID_RECORD_ID");
    }
  });

  it("creates an idempotent like using only the authenticated user", async () => {
    const calls = [];
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({ calls, likeCount: 3 }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      method: "POST",
      headers: authHeaders,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: { recordId: "7", liked: true, likeCount: 3 },
    });
    assert.ok(calls.some((call) => (
      call[0] === "upsert"
      && call[1].user_id === "user-1"
      && call[1].record_id === "7"
      && call[2].onConflict === "user_id,record_id"
      && call[2].ignoreDuplicates === true
    )));
    assert.ok(calls.some((call) => (
      call[0] === "rpc"
      && call[1] === "get_music_record_like_counts"
      && JSON.stringify(call[2].p_record_ids) === JSON.stringify(["7"])
    )));
  });

  it("removes only the authenticated user's like and remains idempotent", async () => {
    const calls = [];
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({ calls, likeCount: 2 }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      method: "DELETE",
      headers: authHeaders,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: { recordId: "7", liked: false, likeCount: 2 },
    });
    assert.ok(calls.some((call) => (
      call[0] === "eq"
      && call[1] === "likes"
      && call[2] === "user_id"
      && call[3] === "user-1"
    )));
    assert.ok(calls.some((call) => (
      call[0] === "eq"
      && call[1] === "likes"
      && call[2] === "record_id"
      && call[3] === "7"
    )));
  });

  it("returns 404 when the record is missing or inaccessible", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({ record: null }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      method: "POST",
      headers: authHeaders,
    });

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "MUSIC_RECORD_NOT_FOUND");
  });

  it("does not report success when the database mutation fails", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        mutationError: new Error("database unavailable"),
      }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      method: "POST",
      headers: authHeaders,
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "좋아요 상태 변경 중 오류가 발생했습니다.",
      },
    });
  });

  it("does not return a stale count when aggregate lookup fails", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        likeCountError: new Error("aggregate unavailable"),
      }),
    });
    const response = await fetch(`${baseUrl}/api/music-records/7/likes`, {
      method: "POST",
      headers: authHeaders,
    });

    assert.equal(response.status, 500);
    assert.equal((await response.json()).error.code, "INTERNAL_SERVER_ERROR");
  });
});
