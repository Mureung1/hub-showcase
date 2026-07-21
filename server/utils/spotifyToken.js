const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify client credentials");
  }

  return { clientId, clientSecret };
}

function createBasicAuthHeader(clientId, clientSecret) {
  const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encodedCredentials}`;
}

export function clearSpotifyTokenCache() {
  cachedToken = null;
  cachedTokenExpiresAt = 0;
}

export async function getSpotifyAccessToken({ fetchImpl = fetch, now = Date.now } = {}) {
  const currentTime = now();

  if (cachedToken && cachedTokenExpiresAt > currentTime) {
    return cachedToken;
  }

  const { clientId, clientSecret } = getSpotifyCredentials();
  const response = await fetchImpl(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    throw new Error(`Spotify authentication failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (typeof payload?.access_token !== "string" || typeof payload?.expires_in !== "number") {
    throw new Error("Invalid Spotify token response");
  }

  cachedToken = payload.access_token;
  cachedTokenExpiresAt = currentTime + payload.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS;

  return cachedToken;
}
