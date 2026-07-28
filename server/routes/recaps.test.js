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
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

function createAuthClient(calls = []) {
  return {
    auth: {
      async getUser(accessToken) {
        calls.push(["getUser", accessToken]);
        return {
          data: { user: { id: "user-1", email: "swimmer@example.com" } },
          error: null,
        };
      },
    },
  };
}

function createRecapQuery(result, calls = []) {
  const query = {
    from(table) {
      calls.push(["from", table]);
      return query;
    },
    select(columns) {
      calls.push(["select", columns]);
      return query;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return query;
    },
    gte(column, value) {
      calls.push(["gte", column, value]);
      return query;
    },
    lt(column, value) {
      calls.push(["lt", column, value]);
      return query;
    },
    order(column, options) {
      calls.push(["order", column, options]);
      return query;
    },
    then(resolve) {
      return Promise.resolve(result).then(resolve);
    },
  };
  return query;
}

function createOptions(query, authCalls = []) {
  return {
    getSupabase: () => createAuthClient(authCalls),
    getAuthenticatedSupabase: () => query,
  };
}

const records = [
  {
    id: 1,
    spotify_track_id: "track-1",
    song_title: "Ditto",
    artist_name: "NewJeans",
    album_name: "OMG",
    album_image_url: "https://example.com/ditto.jpg",
    external_url: "https://open.spotify.com/track/track-1",
    emotion_text: "조용히 시작한 달",
    record_date: "2026-07-01",
    created_at: "2026-07-01T09:00:00.000Z",
  },
  {
    id: 2,
    spotify_track_id: "track-2",
    song_title: "Hype Boy",
    artist_name: "NewJeans",
    album_name: null,
    album_image_url: null,
    external_url: null,
    emotion_text: "가볍게 걷고 싶은 날",
    record_date: "2026-07-14",
    created_at: "2026-07-14T09:00:00.000Z",
  },
  {
    id: 3,
    spotify_track_id: null,
    song_title: "밤편지",
    artist_name: "아이유",
    album_name: "Palette",
    album_image_url: null,
    external_url: null,
    emotion_text: "한 달을 천천히 닫는 마음",
    record_date: "2026-07-31",
    created_at: "2026-07-31T09:00:00.000Z",
  },
];

describe("monthly recap API", () => {
  it("rejects unauthenticated requests", async () => {
    const baseUrl = await startApp();
    const response = await fetch(`${baseUrl}/api/recaps/monthly?year=2026&month=7`);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
    });
  });

  it("validates year and month before querying the database", async () => {
    const calls = [];
    const query = createRecapQuery({ data: [], error: null }, calls);
    const baseUrl = await startApp(createOptions(query));

    for (const search of [
      "",
      "?year=26&month=7",
      "?year=0000&month=7",
      "?year=2026&month=0",
      "?year=2026&month=13",
      "?year=2026&month=07",
    ]) {
      const response = await fetch(`${baseUrl}/api/recaps/monthly${search}`, {
        headers: authHeaders,
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: {
          code: "INVALID_RECAP_MONTH",
          message: "조회할 연도와 월을 확인해주세요.",
        },
      });
    }

    assert.deepEqual(calls, []);
  });

  it("aggregates only the authenticated user's records for the requested month", async () => {
    const calls = [];
    const query = createRecapQuery({ data: records, error: null }, calls);
    const baseUrl = await startApp(createOptions(query));
    const response = await fetch(`${baseUrl}/api/recaps/monthly?year=2026&month=7`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 200);
    const { data } = await response.json();
    assert.equal(data.year, 2026);
    assert.equal(data.month, 7);
    assert.equal(data.recordCount, 3);
    assert.equal(data.recordDays, 3);
    assert.deepEqual(data.topArtists, [
      { artistName: "NewJeans", recordCount: 2 },
      { artistName: "아이유", recordCount: 1 },
    ]);
    assert.equal(data.firstRecord.songTitle, "Ditto");
    assert.equal(data.lastRecord.songTitle, "밤편지");
    assert.equal(JSON.stringify(data).includes("user-1"), false);
    assert.deepEqual(data.tracks.map((track) => track.songTitle), [
      "Ditto",
      "Hype Boy",
      "밤편지",
    ]);
    assert.equal("userId" in data.firstRecord, false);
    assert.deepEqual(calls.filter(([name]) => name === "eq"), [
      ["eq", "user_id", "user-1"],
    ]);
    assert.deepEqual(calls.find(([name]) => name === "gte"), [
      "gte",
      "record_date",
      "2026-07-01",
    ]);
    assert.deepEqual(calls.find(([name]) => name === "lt"), [
      "lt",
      "record_date",
      "2026-08-01",
    ]);
  });

  it("returns a stable empty recap for a month without records", async () => {
    const query = createRecapQuery({ data: [], error: null });
    const baseUrl = await startApp(createOptions(query));
    const response = await fetch(`${baseUrl}/api/recaps/monthly?year=2026&month=12`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: {
        year: 2026,
        month: 12,
        recordCount: 0,
        recordDays: 0,
        topArtists: [],
        firstRecord: null,
        lastRecord: null,
        tracks: [],
      },
    });
  });

  it("uses the next year as the exclusive boundary for December", async () => {
    const calls = [];
    const query = createRecapQuery({ data: [], error: null }, calls);
    const baseUrl = await startApp(createOptions(query));
    await fetch(`${baseUrl}/api/recaps/monthly?year=2026&month=12`, {
      headers: authHeaders,
    });

    assert.deepEqual(calls.find(([name]) => name === "lt"), [
      "lt",
      "record_date",
      "2027-01-01",
    ]);
  });

  it("returns a stable error when the database lookup fails", async () => {
    const query = createRecapQuery({
      data: null,
      error: new Error("database unavailable"),
    });
    const baseUrl = await startApp(createOptions(query));
    const response = await fetch(`${baseUrl}/api/recaps/monthly?year=2026&month=7`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "월간 기록을 정리하는 중 오류가 발생했습니다.",
      },
    });
  });
});
