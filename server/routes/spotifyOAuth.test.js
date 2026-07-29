import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createApp } from "../app.js";

const openServers = [];
const authHeaders = { Authorization: "Bearer valid-access-token" };
const oauthEnv = {
  SPOTIFY_CLIENT_ID: "spotify-client-id",
  SPOTIFY_CLIENT_SECRET: "spotify-client-secret",
  SPOTIFY_REDIRECT_URI: "http://127.0.0.1:3000/api/spotify/callback",
  SPOTIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  APP_FRONTEND_URL: "http://localhost:5173",
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

function createAuthClient() {
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              email: "swimmer@example.com",
            },
          },
          error: null,
        };
      },
    },
  };
}

function createAdmin({
  stateUserId = "11111111-1111-4111-8111-111111111111",
  connection = null,
} = {}) {
  const calls = [];
  let storedConnection = connection;
  let storedState = null;
  const admin = {
    calls,
    from(table) {
      const context = {
        table,
        action: "",
        values: null,
        filters: [],
      };
      calls.push(["from", table]);
      const query = {
        delete() {
          context.action = "delete";
          calls.push(["delete", table]);
          return query;
        },
        insert(values) {
          context.action = "insert";
          context.values = values;
          calls.push(["insert", table, values]);
          if (table === "spotify_oauth_states") storedState = values;
          return query;
        },
        upsert(values, options) {
          context.action = "upsert";
          context.values = values;
          storedConnection = values;
          calls.push(["upsert", table, values, options]);
          return query;
        },
        update(values) {
          context.action = "update";
          context.values = values;
          calls.push(["update", table, values]);
          return query;
        },
        select(columns) {
          if (!context.action) context.action = "select";
          calls.push(["select", table, columns]);
          return query;
        },
        eq(column, value) {
          context.filters.push(["eq", column, value]);
          calls.push(["eq", table, column, value]);
          return query;
        },
        gt(column, value) {
          context.filters.push(["gt", column, value]);
          calls.push(["gt", table, column, value]);
          return query;
        },
        maybeSingle() {
          if (table === "spotify_oauth_states" && context.action === "delete") {
            const stateFilter = context.filters.find(([, column]) => column === "state_hash");
            const expiryFilter = context.filters.find(([, column]) => column === "expires_at");
            const isValid = (
              storedState
              && stateFilter?.[2] === storedState.state_hash
              && expiryFilter?.[2] < storedState.expires_at
            );
            if (isValid) storedState = null;
            return Promise.resolve({
              data: isValid ? { user_id: stateUserId } : null,
              error: null,
            });
          }
          if (table === "spotify_connections" && context.action === "select") {
            return Promise.resolve({ data: storedConnection, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve) {
          if (
            table === "spotify_oauth_states"
            && context.action === "delete"
            && context.filters.some(([, column]) => column === "user_id")
          ) {
            storedState = null;
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        },
      };
      return query;
    },
    getStoredConnection() {
      return storedConnection;
    },
  };
  return admin;
}

function createOptions(admin, overrides = {}) {
  return {
    getSupabase: () => createAuthClient(),
    getAdminSupabase: () => admin,
    env: oauthEnv,
    getSpotifyNow: () => new Date("2026-07-29T00:00:00.000Z"),
    spotifyRandomBytes: (size) => Buffer.alloc(size, 1),
    ...overrides,
  };
}

describe("Spotify OAuth API", () => {
  it("rejects protected OAuth requests without a SWIM session", async () => {
    const baseUrl = await startApp();
    for (const [path, method] of [
      ["/api/spotify/connect", "GET"],
      ["/api/spotify/connection", "GET"],
      ["/api/spotify/connection", "DELETE"],
    ]) {
      const response = await fetch(`${baseUrl}${path}`, { method });
      assert.equal(response.status, 401);
    }
  });

  it("creates a minimal-scope authorize URL and stores only a state hash", async () => {
    const admin = createAdmin();
    const baseUrl = await startApp(createOptions(admin));
    const response = await fetch(`${baseUrl}/api/spotify/connect`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 200);
    const { data } = await response.json();
    const authorizeUrl = new URL(data.authorizeUrl);
    const state = authorizeUrl.searchParams.get("state");
    assert.equal(authorizeUrl.origin + authorizeUrl.pathname, "https://accounts.spotify.com/authorize");
    assert.equal(authorizeUrl.searchParams.get("scope"), "playlist-modify-private");
    assert.equal(authorizeUrl.searchParams.get("response_type"), "code");
    assert.equal(authorizeUrl.searchParams.get("redirect_uri"), oauthEnv.SPOTIFY_REDIRECT_URI);
    const insertCall = admin.calls.find(([name, table]) => (
      name === "insert" && table === "spotify_oauth_states"
    ));
    assert.ok(insertCall);
    assert.notEqual(insertCall[2].state_hash, state);
    assert.equal(insertCall[2].state_hash.length, 64);
    assert.equal(insertCall[2].user_id, "11111111-1111-4111-8111-111111111111");
  });

  it("exchanges a callback code and stores encrypted tokens without exposing them", async () => {
    const admin = createAdmin();
    const spotifyCalls = [];
    const spotifyFetch = async (url, options) => {
      spotifyCalls.push({ url, options });
      if (url === "https://accounts.spotify.com/api/token") {
        return {
          ok: true,
          json: async () => ({
            access_token: "spotify-access-token",
            refresh_token: "spotify-refresh-token",
            expires_in: 3600,
            scope: "playlist-modify-private",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          id: "spotify-user-1",
          display_name: "Quiet Swimmer",
        }),
      };
    };
    const baseUrl = await startApp(createOptions(admin, { spotifyFetch }));
    const connectResponse = await fetch(`${baseUrl}/api/spotify/connect`, {
      headers: authHeaders,
    });
    const connectBody = await connectResponse.json();
    const state = new URL(connectBody.data.authorizeUrl).searchParams.get("state");

    const callbackResponse = await fetch(
      `${baseUrl}/api/spotify/callback?code=authorization-code&state=${encodeURIComponent(state)}`,
      { redirect: "manual" },
    );

    assert.equal(callbackResponse.status, 302);
    assert.equal(
      callbackResponse.headers.get("location"),
      "http://localhost:5173/?spotify=connected",
    );
    assert.equal(spotifyCalls.length, 2);
    const stored = admin.getStoredConnection();
    assert.equal(stored.spotify_user_id, "spotify-user-1");
    assert.equal(stored.spotify_display_name, "Quiet Swimmer");
    assert.notEqual(stored.access_token_encrypted, "spotify-access-token");
    assert.notEqual(stored.refresh_token_encrypted, "spotify-refresh-token");
    assert.equal(JSON.stringify(stored).includes("spotify-refresh-token"), false);
  });

  it("returns only safe connection metadata and disconnects idempotently", async () => {
    const admin = createAdmin({
      connection: {
        spotify_display_name: "Quiet Swimmer",
        scope: "playlist-modify-private",
        token_expires_at: "2026-07-29T01:00:00.000Z",
        access_token_encrypted: "secret",
        refresh_token_encrypted: "secret",
      },
    });
    const baseUrl = await startApp(createOptions(admin));
    const statusResponse = await fetch(`${baseUrl}/api/spotify/connection`, {
      headers: authHeaders,
    });
    const statusBody = await statusResponse.json();

    assert.equal(statusResponse.status, 200);
    assert.deepEqual(statusBody, {
      data: {
        connected: true,
        displayName: "Quiet Swimmer",
        scope: "playlist-modify-private",
        tokenExpiresAt: "2026-07-29T01:00:00.000Z",
      },
    });
    assert.equal(JSON.stringify(statusBody).includes("secret"), false);

    const deleteResponse = await fetch(`${baseUrl}/api/spotify/connection`, {
      method: "DELETE",
      headers: authHeaders,
    });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), {
      data: { connected: false },
    });
    assert.ok(admin.calls.some(([name, table]) => (
      name === "delete" && table === "spotify_oauth_states"
    )));
    assert.ok(admin.calls.some(([name, table]) => (
      name === "delete" && table === "spotify_connections"
    )));
  });

  it("redirects cancelled and invalid callbacks without leaking provider details", async () => {
    const admin = createAdmin();
    const baseUrl = await startApp(createOptions(admin));
    const connectResponse = await fetch(`${baseUrl}/api/spotify/connect`, {
      headers: authHeaders,
    });
    const connectBody = await connectResponse.json();
    const state = new URL(connectBody.data.authorizeUrl).searchParams.get("state");
    const cancelled = await fetch(
      `${baseUrl}/api/spotify/callback?error=access_denied&state=${encodeURIComponent(state)}`,
      { redirect: "manual" },
    );
    assert.equal(cancelled.status, 302);
    assert.equal(
      cancelled.headers.get("location"),
      "http://localhost:5173/?spotify=error&reason=cancelled",
    );

    const invalid = await fetch(
      `${baseUrl}/api/spotify/callback?code=code&state=short`,
      { redirect: "manual" },
    );
    assert.equal(invalid.status, 302);
    assert.equal(
      invalid.headers.get("location"),
      "http://localhost:5173/?spotify=error&reason=invalid_state",
    );
  });

  it("does not store a connection when the required scope was not granted", async () => {
    const admin = createAdmin();
    let spotifyCalls = 0;
    const spotifyFetch = async () => {
      spotifyCalls += 1;
      return {
        ok: true,
        json: async () => ({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          scope: "user-read-email",
        }),
      };
    };
    const baseUrl = await startApp(createOptions(admin, { spotifyFetch }));
    const connectResponse = await fetch(`${baseUrl}/api/spotify/connect`, {
      headers: authHeaders,
    });
    const { data } = await connectResponse.json();
    const state = new URL(data.authorizeUrl).searchParams.get("state");
    const callback = await fetch(
      `${baseUrl}/api/spotify/callback?code=code&state=${encodeURIComponent(state)}`,
      { redirect: "manual" },
    );

    assert.equal(
      callback.headers.get("location"),
      "http://localhost:5173/?spotify=error&reason=insufficient_scope",
    );
    assert.equal(admin.getStoredConnection(), null);
    assert.equal(spotifyCalls, 1);
  });

  it("rejects expired and already consumed states before token exchange", async () => {
    const expiredAdmin = createAdmin();
    let expiredSpotifyCalls = 0;
    const connectBaseUrl = await startApp(createOptions(expiredAdmin));
    const connectResponse = await fetch(`${connectBaseUrl}/api/spotify/connect`, {
      headers: authHeaders,
    });
    const connectBody = await connectResponse.json();
    const expiredState = new URL(connectBody.data.authorizeUrl).searchParams.get("state");
    const expiredCallbackBaseUrl = await startApp(createOptions(expiredAdmin, {
      getSpotifyNow: () => new Date("2026-07-29T00:11:00.000Z"),
      spotifyFetch: async () => {
        expiredSpotifyCalls += 1;
        throw new Error("must not reach Spotify");
      },
    }));
    const expiredCallback = await fetch(
      `${expiredCallbackBaseUrl}/api/spotify/callback?code=code&state=${encodeURIComponent(expiredState)}`,
      { redirect: "manual" },
    );
    assert.equal(
      expiredCallback.headers.get("location"),
      "http://localhost:5173/?spotify=error&reason=invalid_state",
    );
    assert.equal(expiredSpotifyCalls, 0);

    const usedAdmin = createAdmin();
    let usedSpotifyCalls = 0;
    const spotifyFetch = async (url) => {
      usedSpotifyCalls += 1;
      return url === "https://accounts.spotify.com/api/token"
        ? {
            ok: true,
            json: async () => ({
              access_token: "access-token",
              refresh_token: "refresh-token",
              expires_in: 3600,
              scope: "playlist-modify-private",
            }),
          }
        : {
            ok: true,
            json: async () => ({ id: "spotify-user" }),
          };
    };
    const usedBaseUrl = await startApp(createOptions(usedAdmin, { spotifyFetch }));
    const usedConnect = await fetch(`${usedBaseUrl}/api/spotify/connect`, {
      headers: authHeaders,
    });
    const usedBody = await usedConnect.json();
    const usedState = new URL(usedBody.data.authorizeUrl).searchParams.get("state");
    const callbackUrl = `${usedBaseUrl}/api/spotify/callback?code=code&state=${encodeURIComponent(usedState)}`;
    const firstCallback = await fetch(callbackUrl, { redirect: "manual" });
    const callsAfterSuccess = usedSpotifyCalls;
    const secondCallback = await fetch(callbackUrl, { redirect: "manual" });

    assert.equal(firstCallback.headers.get("location"), "http://localhost:5173/?spotify=connected");
    assert.equal(
      secondCallback.headers.get("location"),
      "http://localhost:5173/?spotify=error&reason=invalid_state",
    );
    assert.equal(usedSpotifyCalls, callsAfterSuccess);
  });

  it("fails safely when server-only OAuth configuration is missing", async () => {
    const admin = createAdmin();
    const baseUrl = await startApp(createOptions(admin, { env: {} }));
    const response = await fetch(`${baseUrl}/api/spotify/connect`, {
      headers: authHeaders,
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: {
        code: "SPOTIFY_OAUTH_NOT_CONFIGURED",
        message: "Spotify 연결 설정을 확인해주세요.",
      },
    });
  });
});
