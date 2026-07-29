export interface SpotifyConnection {
  connected: boolean;
  displayName: string | null;
  scope: string | null;
  tokenExpiresAt: string | null;
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

function isSpotifyConnection(value: unknown): value is SpotifyConnection {
  if (!value || typeof value !== "object") return false;
  const connection = value as Partial<SpotifyConnection>;
  return (
    typeof connection.connected === "boolean"
    && (connection.displayName === null || typeof connection.displayName === "string")
    && (connection.scope === null || typeof connection.scope === "string")
    && (connection.tokenExpiresAt === null || typeof connection.tokenExpiresAt === "string")
  );
}

export async function getSpotifyConnection(
  apiBaseUrl: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  const response = await fetch(`${apiBaseUrl}/api/spotify/connection`, {
    headers: authHeaders(accessToken),
    signal,
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Spotify 연결 상태를 확인하지 못했어요."));
  }
  const body: { data?: unknown } = await response.json();
  if (!isSpotifyConnection(body.data)) {
    throw new Error("Spotify 연결 상태 응답을 확인하지 못했어요.");
  }
  return body.data;
}

export async function startSpotifyConnection(apiBaseUrl: string, accessToken: string) {
  const response = await fetch(`${apiBaseUrl}/api/spotify/connect`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Spotify 연결을 시작하지 못했어요."));
  }
  const body: { data?: { authorizeUrl?: unknown } } = await response.json();
  const authorizeUrl = body.data?.authorizeUrl;
  if (typeof authorizeUrl !== "string" || !authorizeUrl.startsWith("https://accounts.spotify.com/")) {
    throw new Error("Spotify 연결 주소를 확인하지 못했어요.");
  }
  return authorizeUrl;
}

export async function disconnectSpotify(apiBaseUrl: string, accessToken: string) {
  const response = await fetch(`${apiBaseUrl}/api/spotify/connection`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Spotify 연결을 해제하지 못했어요."));
  }
}
