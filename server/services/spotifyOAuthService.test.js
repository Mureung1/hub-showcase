import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  completeSpotifyAuthorization,
  getSpotifyUserAccessToken,
} from "./spotifyOAuthService.js";

const env = {
  SPOTIFY_CLIENT_ID: "client-id",
  SPOTIFY_CLIENT_SECRET: "client-secret",
  SPOTIFY_REDIRECT_URI: "http://localhost:3000/api/spotify/callback",
  SPOTIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
};

function createMemoryAdmin() {
  let connection = null;
  return {
    from(table) {
      const context = { action: "", values: null };
      const query = {
        delete() {
          context.action = "delete";
          return query;
        },
        select() {
          if (!context.action) context.action = "select";
          return query;
        },
        eq() {
          return query;
        },
        gt() {
          return query;
        },
        upsert(values) {
          connection = values;
          return query;
        },
        update(values) {
          connection = { ...connection, ...values };
          return query;
        },
        maybeSingle() {
          if (table === "spotify_oauth_states") {
            return Promise.resolve({
              data: { user_id: "11111111-1111-4111-8111-111111111111" },
              error: null,
            });
          }
          return Promise.resolve({ data: connection, error: null });
        },
        then(resolve) {
          return Promise.resolve({ data: null, error: null }).then(resolve);
        },
      };
      return query;
    },
    getConnection() {
      return connection;
    },
  };
}

describe("Spotify OAuth token refresh", () => {
  it("refreshes an expired access token and retains an omitted refresh token", async () => {
    const admin = createMemoryAdmin();
    let tokenRequest = 0;
    const fetchImpl = async (url) => {
      if (url === "https://accounts.spotify.com/api/token") {
        tokenRequest += 1;
        return tokenRequest === 1
          ? {
              ok: true,
              json: async () => ({
                access_token: "initial-access",
                refresh_token: "long-lived-refresh",
                expires_in: 3600,
                scope: "playlist-modify-private",
              }),
            }
          : {
              ok: true,
              json: async () => ({
                access_token: "refreshed-access",
                expires_in: 3600,
                scope: "playlist-modify-private",
              }),
            };
      }
      return {
        ok: true,
        json: async () => ({ id: "spotify-user", display_name: "Swimmer" }),
      };
    };

    await completeSpotifyAuthorization(
      admin,
      { state: "a".repeat(43), code: "authorization-code" },
      {
        env,
        fetchImpl,
        now: new Date("2026-07-29T00:00:00.000Z"),
        randomBytesFn: (size) => Buffer.alloc(size, tokenRequest + 1),
      },
    );
    const originalRefreshToken = admin.getConnection().refresh_token_encrypted;

    const accessToken = await getSpotifyUserAccessToken(
      admin,
      "11111111-1111-4111-8111-111111111111",
      {
        env,
        fetchImpl,
        now: new Date("2026-07-29T02:00:00.000Z"),
        randomBytesFn: (size) => Buffer.alloc(size, 5),
      },
    );

    assert.equal(accessToken, "refreshed-access");
    assert.equal(tokenRequest, 2);
    assert.notEqual(admin.getConnection().access_token_encrypted, "refreshed-access");
    assert.notEqual(admin.getConnection().refresh_token_encrypted, originalRefreshToken);
    assert.equal(
      JSON.stringify(admin.getConnection()).includes("long-lived-refresh"),
      false,
    );
  });

  it("rejects a refresh response that explicitly removes the required scope", async () => {
    const admin = createMemoryAdmin();
    let tokenRequest = 0;
    const fetchImpl = async (url) => {
      if (url === "https://accounts.spotify.com/api/token") {
        tokenRequest += 1;
        return tokenRequest === 1
          ? {
              ok: true,
              json: async () => ({
                access_token: "initial-access",
                refresh_token: "refresh-token",
                expires_in: 3600,
                scope: "playlist-modify-private",
              }),
            }
          : {
              ok: true,
              json: async () => ({
                access_token: "insufficient-access",
                expires_in: 3600,
                scope: "user-read-email",
              }),
            };
      }
      return {
        ok: true,
        json: async () => ({ id: "spotify-user" }),
      };
    };
    await completeSpotifyAuthorization(
      admin,
      { state: "b".repeat(43), code: "authorization-code" },
      {
        env,
        fetchImpl,
        now: new Date("2026-07-29T00:00:00.000Z"),
        randomBytesFn: (size) => Buffer.alloc(size, 2),
      },
    );

    await assert.rejects(
      getSpotifyUserAccessToken(
        admin,
        "11111111-1111-4111-8111-111111111111",
        {
          env,
          fetchImpl,
          now: new Date("2026-07-29T02:00:00.000Z"),
          randomBytesFn: (size) => Buffer.alloc(size, 3),
        },
      ),
      (error) => error?.code === "insufficient_scope",
    );
  });
});
