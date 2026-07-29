import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";
const REQUIRED_SCOPE = "playlist-modify-private";
const STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_REFRESH_MARGIN_MS = 60 * 1000;

export class SpotifyOAuthConfigurationError extends Error {}
export class SpotifyOAuthStateError extends Error {}
export class SpotifyOAuthProviderError extends Error {
  constructor(message, code = "provider_error") {
    super(message);
    this.code = code;
  }
}

function getConfig(env = process.env) {
  const {
    SPOTIFY_CLIENT_ID: clientId,
    SPOTIFY_CLIENT_SECRET: clientSecret,
    SPOTIFY_REDIRECT_URI: redirectUri,
    SPOTIFY_TOKEN_ENCRYPTION_KEY: encryptionKey,
  } = env;
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
    throw new SpotifyOAuthConfigurationError(
      "Spotify OAuth 환경변수가 설정되지 않았습니다.",
    );
  }

  const key = Buffer.from(encryptionKey, "base64");
  if (key.length !== 32) {
    throw new SpotifyOAuthConfigurationError(
      "SPOTIFY_TOKEN_ENCRYPTION_KEY는 32바이트 base64 값이어야 합니다.",
    );
  }
  return { clientId, clientSecret, redirectUri, key };
}

function hashState(state) {
  return createHash("sha256").update(state).digest("hex");
}

function hasRequiredScope(scope) {
  return (
    typeof scope === "string"
    && scope.split(/\s+/).filter(Boolean).includes(REQUIRED_SCOPE)
  );
}

function encryptToken(token, key, randomBytesFn = randomBytes) {
  const iv = randomBytesFn(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptToken(payload, key) {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted Spotify token");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function requestToken(parameters, config, fetchImpl) {
  const response = await fetchImpl(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${config.clientId}:${config.clientSecret}`,
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(parameters),
  });
  const payload = await response.json().catch(() => null);
  if (
    !response.ok
    || typeof payload?.access_token !== "string"
    || !Number.isFinite(payload?.expires_in)
  ) {
    throw new SpotifyOAuthProviderError(
      "Spotify token 요청에 실패했습니다.",
      response.status === 400 ? "invalid_grant" : "provider_error",
    );
  }
  return payload;
}

async function consumeState(admin, state, now) {
  if (typeof state !== "string" || state.length < 32) {
    throw new SpotifyOAuthStateError("유효하지 않은 Spotify 연결 state입니다.");
  }
  const { data, error } = await admin
    .from("spotify_oauth_states")
    .delete()
    .eq("state_hash", hashState(state))
    .gt("expires_at", now.toISOString())
    .select("user_id")
    .maybeSingle();
  if (error) throw error;
  if (!data?.user_id) {
    throw new SpotifyOAuthStateError("Spotify 연결 state가 만료되었거나 이미 사용됐습니다.");
  }
  return data.user_id;
}

export async function createSpotifyAuthorization(
  admin,
  userId,
  {
    env = process.env,
    now = new Date(),
    randomBytesFn = randomBytes,
  } = {},
) {
  const config = getConfig(env);
  const state = randomBytesFn(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + STATE_TTL_MS).toISOString();

  const { error: deleteError } = await admin
    .from("spotify_oauth_states")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  const { error } = await admin.from("spotify_oauth_states").insert({
    state_hash: hashState(state),
    user_id: userId,
    expires_at: expiresAt,
  });
  if (error) throw error;

  const search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: REQUIRED_SCOPE,
    state,
  });
  return { authorizeUrl: `${SPOTIFY_AUTHORIZE_URL}?${search}` };
}

export async function completeSpotifyAuthorization(
  admin,
  { state, code, providerError },
  {
    env = process.env,
    fetchImpl = fetch,
    now = new Date(),
    randomBytesFn = randomBytes,
  } = {},
) {
  const config = getConfig(env);
  const userId = await consumeState(admin, state, now);
  if (providerError) {
    throw new SpotifyOAuthProviderError(
      "Spotify 연결이 취소되었습니다.",
      providerError === "access_denied" ? "cancelled" : "provider_error",
    );
  }
  if (typeof code !== "string" || code.length === 0) {
    throw new SpotifyOAuthProviderError("Spotify authorization code가 없습니다.", "missing_code");
  }

  const token = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  }, config, fetchImpl);
  if (
    typeof token.refresh_token !== "string"
    || !Number.isFinite(token.expires_in)
  ) {
    throw new SpotifyOAuthProviderError("Spotify token 응답이 올바르지 않습니다.");
  }
  if (!hasRequiredScope(token.scope)) {
    throw new SpotifyOAuthProviderError(
      "Spotify 플레이리스트 권한이 승인되지 않았습니다.",
      "insufficient_scope",
    );
  }

  const profileResponse = await fetchImpl(SPOTIFY_ME_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const spotifyProfile = await profileResponse.json().catch(() => null);
  if (!profileResponse.ok || typeof spotifyProfile?.id !== "string") {
    throw new SpotifyOAuthProviderError("Spotify 사용자 정보를 확인하지 못했습니다.");
  }

  const expiresAt = new Date(now.getTime() + token.expires_in * 1000).toISOString();
  const { error } = await admin.from("spotify_connections").upsert({
    user_id: userId,
    spotify_user_id: spotifyProfile.id,
    spotify_display_name: spotifyProfile.display_name ?? null,
    access_token_encrypted: encryptToken(token.access_token, config.key, randomBytesFn),
    refresh_token_encrypted: encryptToken(token.refresh_token, config.key, randomBytesFn),
    token_expires_at: expiresAt,
    scope: token.scope,
    updated_at: now.toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;

  return { userId };
}

export async function getSpotifyConnection(admin, userId) {
  const { data, error } = await admin
    .from("spotify_connections")
    .select("spotify_display_name, scope, token_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        connected: true,
        displayName: data.spotify_display_name ?? null,
        scope: data.scope,
        tokenExpiresAt: data.token_expires_at,
      }
    : {
        connected: false,
        displayName: null,
        scope: null,
        tokenExpiresAt: null,
      };
}

export async function disconnectSpotify(admin, userId) {
  const { error: stateError } = await admin
    .from("spotify_oauth_states")
    .delete()
    .eq("user_id", userId);
  if (stateError) throw stateError;

  const { error } = await admin
    .from("spotify_connections")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
  return { connected: false };
}

export async function getSpotifyUserAccessToken(
  admin,
  userId,
  {
    env = process.env,
    fetchImpl = fetch,
    now = new Date(),
    randomBytesFn = randomBytes,
  } = {},
) {
  const config = getConfig(env);
  const { data, error } = await admin
    .from("spotify_connections")
    .select("access_token_encrypted, refresh_token_encrypted, token_expires_at, scope")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new SpotifyOAuthProviderError("Spotify 계정이 연결되지 않았습니다.", "not_connected");

  if (new Date(data.token_expires_at).getTime() > now.getTime() + TOKEN_REFRESH_MARGIN_MS) {
    return decryptToken(data.access_token_encrypted, config.key);
  }

  const refreshToken = decryptToken(data.refresh_token_encrypted, config.key);
  const token = await requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }, config, fetchImpl);
  const nextRefreshToken = typeof token.refresh_token === "string"
    ? token.refresh_token
    : refreshToken;
  const nextScope = token.scope ?? data.scope;
  if (!hasRequiredScope(nextScope)) {
    throw new SpotifyOAuthProviderError(
      "Spotify 플레이리스트 권한이 만료되었거나 철회되었습니다.",
      "insufficient_scope",
    );
  }
  const expiresAt = new Date(now.getTime() + token.expires_in * 1000).toISOString();
  const { error: updateError } = await admin
    .from("spotify_connections")
    .update({
      access_token_encrypted: encryptToken(token.access_token, config.key, randomBytesFn),
      refresh_token_encrypted: encryptToken(nextRefreshToken, config.key, randomBytesFn),
      token_expires_at: expiresAt,
      scope: nextScope,
      updated_at: now.toISOString(),
    })
    .eq("user_id", userId);
  if (updateError) throw updateError;
  return token.access_token;
}
