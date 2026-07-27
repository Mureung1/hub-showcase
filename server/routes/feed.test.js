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
  follows = [],
  records = [],
  followsError = null,
  recordsError = null,
  likes = [],
  likesError = null,
  likeCounts = [],
  likeCountsError = null,
  calls = [],
} = {}) {
  return {
    rpc(name, parameters) {
      calls.push(["rpc", name, parameters]);
      return Promise.resolve({ data: likeCounts, error: likeCountsError });
    },
    from(table) {
      calls.push(["from", table]);
      const result = table === "follows"
        ? { data: follows, error: followsError }
        : table === "likes"
          ? { data: likes, error: likesError }
          : { data: records, error: recordsError };
      const query = {
        select(columns) {
          calls.push(["select", table, columns]);
          return query;
        },
        eq(column, value) {
          calls.push(["eq", table, column, value]);
          return query;
        },
        in(column, values) {
          calls.push(["in", table, column, values]);
          return query;
        },
        order(column, options) {
          calls.push(["order", table, column, options]);
          return query;
        },
        then(resolve) {
          return Promise.resolve(result).then(resolve);
        },
      };
      return query;
    },
  };
}

describe("feed API", () => {
  it("rejects unauthenticated requests", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/feed`);
    assert.equal(response.status, 401);
  });

  it("does not query records when the user follows nobody", async () => {
    const calls = [];
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({ calls }),
    });
    const response = await fetch(`${baseUrl}/api/feed`, { headers: authHeaders });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [],
      meta: { followingCount: 0 },
    });
    assert.equal(calls.some((call) => call[1] === "music_records"), false);
  });

  it("distinguishes followed users who have no records", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        follows: [{ following_id: "user-2" }],
      }),
    });
    const response = await fetch(`${baseUrl}/api/feed`, { headers: authHeaders });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [],
      meta: { followingCount: 1 },
    });
  });

  it("loads only followed users' records and hides internal user IDs", async () => {
    const calls = [];
    const database = createDatabase({
      follows: [
        { following_id: "user-2" },
        { following_id: "user-3" },
        { following_id: "user-2" },
      ],
      records: [{
        id: 7,
        user_id: "user-2",
        spotify_track_id: "track-1",
        song_title: "Ditto",
        artist_name: "NewJeans",
        album_name: "OMG",
        album_image_url: "https://example.com/album.jpg",
        external_url: "https://open.spotify.com/track/track-1",
        emotion_text: "오늘을 천천히 흘려보낸 마음",
        record_date: "2026-07-27",
        created_at: "2026-07-27T09:00:00.000Z",
        author: {
          id: "user-2",
          nickname: "잔잔한파도",
          avatar_url: "https://example.com/avatar.jpg",
        },
      }],
      likes: [{ record_id: 7 }],
      likeCounts: [{ record_id: 7, like_count: 3 }],
      calls,
    });
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => database,
    });
    const response = await fetch(`${baseUrl}/api/feed`, { headers: authHeaders });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.meta.followingCount, 2);
    assert.equal(body.data[0].liked, true);
    assert.equal(body.data[0].likeCount, 3);
    assert.deepEqual(body.data[0].author, {
      nickname: "잔잔한파도",
      avatarUrl: "https://example.com/avatar.jpg",
    });
    assert.equal("userId" in body.data[0], false);
    assert.equal("id" in body.data[0].author, false);
    assert.ok(calls.some((call) => (
      call[0] === "in"
      && call[2] === "user_id"
      && JSON.stringify(call[3]) === JSON.stringify(["user-2", "user-3"])
    )));
    assert.deepEqual(
      calls.filter((call) => call[0] === "order").map((call) => call[2]),
      ["record_date", "created_at"],
    );
    assert.ok(calls.some((call) => (
      call[0] === "eq"
      && call[1] === "likes"
      && call[2] === "user_id"
      && call[3] === "user-1"
    )));
  });

  it("returns a stable error when the database lookup fails", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        followsError: new Error("database unavailable"),
      }),
    });
    const response = await fetch(`${baseUrl}/api/feed`, { headers: authHeaders });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "팔로잉 피드를 불러오는 중 오류가 발생했습니다.",
      },
    });
  });

  it("returns a stable error when the like state lookup fails", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        follows: [{ following_id: "user-2" }],
        records: [{ id: 7 }],
        likesError: new Error("likes unavailable"),
      }),
    });
    const response = await fetch(`${baseUrl}/api/feed`, { headers: authHeaders });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "팔로잉 피드를 불러오는 중 오류가 발생했습니다.",
      },
    });
  });

  it("returns a stable error when the aggregate count lookup fails", async () => {
    const baseUrl = await startApp({
      getSupabase: createAuthClient,
      getAuthenticatedSupabase: () => createDatabase({
        follows: [{ following_id: "user-2" }],
        records: [{ id: 7 }],
        likeCountsError: new Error("aggregate unavailable"),
      }),
    });
    const response = await fetch(`${baseUrl}/api/feed`, { headers: authHeaders });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "팔로잉 피드를 불러오는 중 오류가 발생했습니다.",
      },
    });
  });
});
