import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../app.js";

const openServers = [];

afterEach(() => {
  openServers.splice(0).forEach((server) => server.close());
});

async function startApp(getSupabase) {
  const server = createApp({ getSupabase }).listen(0);
  openServers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

function createSupabaseQuery(result, calls) {
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
    then(resolve) {
      return Promise.resolve(result).then(resolve);
    },
  };
  return query;
}

describe("SWIM API", () => {
  it("returns the health status", async () => {
    const baseUrl = await startApp(() => ({}));
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("returns ordered camelCase music records", async () => {
    const calls = [];
    const query = createSupabaseQuery({
      data: [{
        id: 1,
        song_title: "Ditto",
        artist_name: "NewJeans",
        emotion_text: "조용히 위로받은 하루",
        record_date: "2026-07-15",
        created_at: "2026-07-15T10:30:00.000Z",
      }],
      error: null,
    }, calls);
    const baseUrl = await startApp(() => query);

    const response = await fetch(`${baseUrl}/api/music-records`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [{
        id: 1,
        songTitle: "Ditto",
        artistName: "NewJeans",
        emotionText: "조용히 위로받은 하루",
        recordDate: "2026-07-15",
        createdAt: "2026-07-15T10:30:00.000Z",
      }],
    });
    assert.deepEqual(calls.filter(([name]) => name === "order"), [
      ["order", "record_date", { ascending: false }],
      ["order", "created_at", { ascending: false }],
    ]);
  });

  it("returns an empty data array", async () => {
    const query = createSupabaseQuery({ data: [], error: null }, []);
    const baseUrl = await startApp(() => query);
    const response = await fetch(`${baseUrl}/api/music-records`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [] });
  });

  it("returns the stable internal error response", async () => {
    const query = createSupabaseQuery({ data: null, error: new Error("database unavailable") }, []);
    const baseUrl = await startApp(() => query);
    const response = await fetch(`${baseUrl}/api/music-records`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "음악 기록 조회 중 오류가 발생했습니다.",
      },
    });
  });
});
