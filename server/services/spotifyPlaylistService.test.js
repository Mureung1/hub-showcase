import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exportMonthlyRecapPlaylist } from "./spotifyPlaylistService.js";

function createAdmin(existing = null, { failCompletionOnce = false } = {}) {
  let stored = existing;
  let previousStored = existing;
  let shouldFailCompletion = failCompletionOnce;
  return {
    from() {
      let action = "select";
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve({ data: stored, error: null });
        },
        insert(values) {
          action = "insert";
          stored = values;
          return query;
        },
        update(values) {
          action = "update";
          query.values = values;
          previousStored = stored;
          stored = { ...stored, ...values };
          return query;
        },
        single() {
          if (query.values?.status === "completed" && shouldFailCompletion) {
            shouldFailCompletion = false;
            stored = previousStored;
            return Promise.resolve({ data: null, error: new Error("database unavailable") });
          }
          return Promise.resolve({
            data: action === "update"
              ? {
                  recap_year: query.values.recap_year,
                  recap_month: query.values.recap_month,
                  spotify_playlist_url: query.values.spotify_playlist_url,
                  track_count: query.values.track_count,
                }
              : null,
            error: null,
          });
        },
        then(resolve) {
          return Promise.resolve({ data: action === "insert" ? stored : null, error: null }).then(resolve);
        },
      };
      return query;
    },
  };
}

function createRecordsClient(records) {
  const query = {
    from() {
      return query;
    },
    select() {
      return query;
    },
    eq() {
      return query;
    },
    gte() {
      return query;
    },
    lt() {
      return query;
    },
    order() {
      return query;
    },
    then(resolve) {
      return Promise.resolve({ data: records, error: null }).then(resolve);
    },
  };
  return query;
}

describe("Spotify playlist export service", () => {
  it("returns the saved monthly playlist without calling Spotify again", async () => {
    const result = await exportMonthlyRecapPlaylist(
      createAdmin({
        recap_year: 2026,
        recap_month: 7,
        spotify_playlist_url: "https://open.spotify.com/playlist/existing",
        track_count: 2,
        status: "completed",
      }),
      createRecordsClient([]),
      "user-1",
      2026,
      7,
      {
        getUserAccessToken: async () => assert.fail("must not request token"),
        fetchImpl: async () => assert.fail("must not call Spotify"),
      },
    );

    assert.equal(result.reused, true);
    assert.equal(result.playlistUrl, "https://open.spotify.com/playlist/existing");
  });

  it("creates a private playlist and preserves daily track URIs in 100-item batches", async () => {
    const records = Array.from({ length: 205 }, (_, index) => ({
      id: index + 1,
      spotify_track_id: `track${index + 1}`,
      record_date: "2026-07-01",
      created_at: "2026-07-01T00:00:00.000Z",
    }));
    records.push({ ...records[0], id: 999 });
    const spotifyCalls = [];
    const result = await exportMonthlyRecapPlaylist(
      createAdmin(),
      createRecordsClient(records),
      "user-1",
      2026,
      7,
      {
        getUserAccessToken: async () => "spotify-token",
        fetchImpl: async (url, options) => {
          spotifyCalls.push({ url, options });
          if (url.endsWith("/me/playlists")) {
            return {
              ok: true,
              json: async () => ({
                id: "playlist-1",
                external_urls: { spotify: "https://open.spotify.com/playlist/playlist-1" },
              }),
            };
          }
          return { ok: true, json: async () => ({ snapshot_id: "snapshot" }) };
        },
      },
    );

    assert.equal(result.trackCount, 206);
    assert.equal(result.reused, false);
    assert.equal(spotifyCalls[0].url, "https://api.spotify.com/v1/me/playlists");
    assert.deepEqual(JSON.parse(spotifyCalls[0].options.body), {
      name: "2026년 7월, SWIM Music Diary",
      description: "SWIM에서 기록한 한 달의 음악 일기",
      public: false,
    });
    assert.deepEqual(
      spotifyCalls.slice(1).map((call) => JSON.parse(call.options.body).uris.length),
      [100, 100, 6],
    );
    assert.equal(
      JSON.parse(spotifyCalls.at(-1).options.body).uris.at(-1),
      "spotify:track:track1",
    );
    assert.ok(spotifyCalls.every((call) => (
      call.options.headers.Authorization === "Bearer spotify-token"
    )));
  });

  it("reuses and safely replaces a created playlist after a partial failure", async () => {
    const admin = createAdmin();
    const records = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1,
      spotify_track_id: `track${index + 1}`,
      record_date: "2026-07-01",
      created_at: "2026-07-01T00:00:00.000Z",
    }));
    const spotifyCalls = [];
    let failSecondBatch = true;
    const fetchImpl = async (url, options) => {
      spotifyCalls.push({ url, options });
      if (url.endsWith("/me/playlists")) {
        return {
          ok: true,
          json: async () => ({
            id: "playlist-recovery",
            external_urls: { spotify: "https://open.spotify.com/playlist/playlist-recovery" },
          }),
        };
      }
      const batchCalls = spotifyCalls.filter((call) => call.url.includes("/items"));
      if (failSecondBatch && batchCalls.length === 2) {
        failSecondBatch = false;
        return {
          ok: false,
          status: 429,
          headers: { get: () => "3" },
        };
      }
      return { ok: true, json: async () => ({ snapshot_id: "snapshot" }) };
    };
    const options = {
      getUserAccessToken: async () => "spotify-token",
      fetchImpl,
      now: new Date("2026-07-29T00:00:00.000Z"),
    };

    await assert.rejects(
      exportMonthlyRecapPlaylist(
        admin,
        createRecordsClient(records),
        "user-1",
        2026,
        7,
        options,
      ),
      (error) => error.code === "SPOTIFY_RATE_LIMITED",
    );

    const recovered = await exportMonthlyRecapPlaylist(
      admin,
      createRecordsClient(records),
      "user-1",
      2026,
      7,
      { ...options, now: new Date("2026-07-29T00:00:05.000Z") },
    );

    assert.equal(recovered.playlistUrl, "https://open.spotify.com/playlist/playlist-recovery");
    assert.equal(spotifyCalls.filter((call) => call.url.endsWith("/me/playlists")).length, 1);
    const recoveryItemCalls = spotifyCalls.filter((call) => (
      call.url.includes("/items") && call.options.method === "PUT"
    ));
    assert.equal(recoveryItemCalls.length, 1);
    assert.equal(JSON.parse(recoveryItemCalls[0].options.body).uris.length, 100);
  });

  it("recovers a stale creating lease and a failed completion without creating another playlist", async () => {
    const admin = createAdmin({
      user_id: "user-1",
      recap_year: 2026,
      recap_month: 7,
      spotify_playlist_id: "playlist-stale",
      spotify_playlist_url: "https://open.spotify.com/playlist/playlist-stale",
      track_count: 1,
      status: "creating",
      updated_at: "2026-07-29T00:00:00.000Z",
    }, { failCompletionOnce: true });
    const records = [{
      id: 1,
      spotify_track_id: "track1",
      record_date: "2026-07-01",
      created_at: "2026-07-01T00:00:00.000Z",
    }];
    const spotifyCalls = [];
    const options = {
      getUserAccessToken: async () => "spotify-token",
      fetchImpl: async (url, request) => {
        spotifyCalls.push({ url, request });
        return { ok: true, json: async () => ({ snapshot_id: "snapshot" }) };
      },
      now: new Date("2026-07-29T00:06:00.000Z"),
    };

    await assert.rejects(
      exportMonthlyRecapPlaylist(
        admin,
        createRecordsClient(records),
        "user-1",
        2026,
        7,
        options,
      ),
      /database unavailable/,
    );
    const recovered = await exportMonthlyRecapPlaylist(
      admin,
      createRecordsClient(records),
      "user-1",
      2026,
      7,
      { ...options, now: new Date("2026-07-29T00:06:05.000Z") },
    );

    assert.equal(recovered.playlistUrl, "https://open.spotify.com/playlist/playlist-stale");
    assert.equal(spotifyCalls.some((call) => call.url.endsWith("/me/playlists")), false);
    assert.ok(spotifyCalls.every((call) => call.request.method === "PUT"));
  });
});
