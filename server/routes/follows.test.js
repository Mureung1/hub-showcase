import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../app.js";

const openServers = [];
const authHeaders = {
  Authorization: "Bearer valid-access-token",
  "Content-Type": "application/json",
};

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

function resolvedQuery(result) {
  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    ilike() {
      return query;
    },
    maybeSingle() {
      return Promise.resolve(result);
    },
    upsert() {
      return Promise.resolve(result);
    },
    delete() {
      return query;
    },
    then(resolve) {
      return Promise.resolve(result).then(resolve);
    },
  };
  return query;
}

function createDatabase({
  profile = { id: "user-2", nickname: "잔잔한파도" },
  error = null,
  calls = [],
} = {}) {
  return {
    from(table) {
      calls.push(["from", table]);
      if (table === "profiles") {
        const query = resolvedQuery({ data: profile, error });
        const originalIlike = query.ilike;
        query.ilike = (column, value) => {
          calls.push(["ilike", column, value]);
          return originalIlike.call(query, column, value);
        };
        return query;
      }

      const query = resolvedQuery({ data: null, error });
      query.upsert = (value, options) => {
        calls.push(["upsert", value, options]);
        return Promise.resolve({ data: null, error });
      };
      query.delete = () => {
        calls.push(["delete"]);
        return query;
      };
      query.eq = (column, value) => {
        calls.push(["eq", column, value]);
        return query;
      };
      return query;
    },
  };
}

describe("follows API", () => {
  it("rejects unauthenticated requests", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/follows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingNickname: "잔잔한파도" }),
    });

    assert.equal(response.status, 401);
  });

  it("creates a follow using the authenticated user as follower", async () => {
    const calls = [];
    const database = createDatabase({ calls });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(`${baseUrl}/api/follows`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ followingNickname: "잔잔한파도" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: { followingNickname: "잔잔한파도", isFollowing: true },
    });
    assert.ok(calls.some((call) => (
      call[0] === "ilike"
      && call[1] === "nickname"
      && call[2] === "잔잔한파도"
    )));
    assert.ok(calls.some((call) => (
      call[0] === "upsert"
      && call[1].follower_id === "user-1"
      && call[1].following_id === "user-2"
      && call[2].ignoreDuplicates === true
    )));
  });

  it("deletes only the authenticated user's follow relation", async () => {
    const calls = [];
    const database = createDatabase({ calls });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(
      `${baseUrl}/api/follows/${encodeURIComponent("잔잔한파도")}`,
      {
      method: "DELETE",
      headers: { Authorization: authHeaders.Authorization },
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: { followingNickname: "잔잔한파도", isFollowing: false },
    });
    assert.ok(calls.some((call) => call[0] === "delete"));
    assert.ok(calls.some((call) => (
      call[0] === "eq" && call[1] === "follower_id" && call[2] === "user-1"
    )));
  });

  it("rejects self-follow and a missing target", async () => {
    const selfDatabase = createDatabase({
      profile: { id: "user-1", nickname: "나자신" },
    });
    const selfBaseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => selfDatabase,
    });

    const selfResponse = await fetch(`${selfBaseUrl}/api/follows`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ followingNickname: "나자신" }),
    });
    assert.equal(selfResponse.status, 400);

    const missingDatabase = createDatabase({ profile: null });
    const missingBaseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => missingDatabase,
    });
    const missingResponse = await fetch(`${missingBaseUrl}/api/follows`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ followingNickname: "없는사람" }),
    });
    assert.equal(missingResponse.status, 404);
  });

  it("rejects one-character and 21-character nicknames before querying the database", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => {
        throw new Error("database should not be called");
      },
    });

    const shortNicknameResponse = await fetch(`${baseUrl}/api/follows`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ followingNickname: "a" }),
    });

    assert.equal(shortNicknameResponse.status, 400);
    assert.deepEqual(await shortNicknameResponse.json(), {
      error: {
        code: "INVALID_FOLLOW_TARGET",
        message: "팔로우할 사용자 닉네임을 확인해 주세요.",
      },
    });

    const longNicknameResponse = await fetch(
      `${baseUrl}/api/follows/${encodeURIComponent("가".repeat(21))}`,
      {
        method: "DELETE",
        headers: { Authorization: authHeaders.Authorization },
      },
    );

    assert.equal(longNicknameResponse.status, 400);
    assert.deepEqual(await longNicknameResponse.json(), {
      error: {
        code: "INVALID_FOLLOW_TARGET",
        message: "팔로우할 사용자 닉네임을 확인해 주세요.",
      },
    });
  });

  it("returns a stable error when the database update fails", async () => {
    const database = createDatabase({ error: new Error("database unavailable") });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });

    const response = await fetch(`${baseUrl}/api/follows`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ followingNickname: "잔잔한파도" }),
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "팔로우 상태 변경 중 오류가 발생했습니다.",
      },
    });
  });
});
