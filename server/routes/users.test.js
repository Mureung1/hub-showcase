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

describe("users API", () => {
  it("rejects requests without authentication", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/users`);

    assert.equal(response.status, 401);
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
