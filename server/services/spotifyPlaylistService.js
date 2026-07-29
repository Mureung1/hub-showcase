import { getMonthRange } from "./recapsService.js";
import {
  getSpotifyUserAccessToken,
  SpotifyOAuthConfigurationError,
  SpotifyOAuthProviderError,
} from "./spotifyOAuthService.js";

const SPOTIFY_API_URL = "https://api.spotify.com/v1";
const TRACK_BATCH_SIZE = 100;
const EXPORT_LEASE_MS = 5 * 60 * 1000;

export class SpotifyPlaylistExportError extends Error {
  constructor(message, code, status = 500, retryAfter = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function mapExport(row, reused) {
  return {
    year: row.recap_year,
    month: row.recap_month,
    playlistUrl: row.spotify_playlist_url,
    trackCount: row.track_count,
    reused,
  };
}

function getSpotifyTrackUris(records) {
  return records
    .map((record) => record.spotify_track_id)
    .filter((trackId) => typeof trackId === "string" && /^[A-Za-z0-9]+$/.test(trackId))
    .map((trackId) => `spotify:track:${trackId}`);
}

async function requestSpotify(url, options, fetchImpl) {
  const response = await fetchImpl(url, options);
  if (response.ok) return response;

  const retryAfter = response.headers?.get?.("retry-after") ?? null;
  if (response.status === 401) {
    throw new SpotifyPlaylistExportError(
      "Spotify 연결이 만료됐어요. 계정을 다시 연결해 주세요.",
      "SPOTIFY_AUTH_EXPIRED",
      401,
    );
  }
  if (response.status === 403) {
    throw new SpotifyPlaylistExportError(
      "Spotify 플레이리스트 권한을 확인해 주세요.",
      "SPOTIFY_PLAYLIST_FORBIDDEN",
      403,
    );
  }
  if (response.status === 429) {
    throw new SpotifyPlaylistExportError(
      "Spotify 요청이 많아요. 잠시 후 다시 시도해 주세요.",
      "SPOTIFY_RATE_LIMITED",
      429,
      retryAfter,
    );
  }
  throw new SpotifyPlaylistExportError(
    "Spotify 플레이리스트를 만들지 못했어요.",
    "SPOTIFY_UNAVAILABLE",
    502,
  );
}

async function findExistingExport(admin, userId, year, month) {
  const { data, error } = await admin
    .from("spotify_playlist_exports")
    .select("recap_year, recap_month, spotify_playlist_id, spotify_playlist_url, track_count, status, updated_at")
    .eq("user_id", userId)
    .eq("recap_year", year)
    .eq("recap_month", month)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function exportMonthlyRecapPlaylist(
  admin,
  supabase,
  userId,
  year,
  month,
  {
    fetchImpl = fetch,
    getUserAccessToken = getSpotifyUserAccessToken,
    oauthOptions = {},
    now = new Date(),
  } = {},
) {
  let existing = await findExistingExport(admin, userId, year, month);
  if (existing?.status === "completed" && existing.spotify_playlist_url) {
    return mapExport(existing, true);
  }

  const { startDate, endDate } = getMonthRange(year, month);
  const { data: records, error: recordsError } = await supabase
    .from("music_records")
    .select("spotify_track_id, record_date, created_at, id")
    .eq("user_id", userId)
    .gte("record_date", startDate)
    .lt("record_date", endDate)
    .order("record_date", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (recordsError) throw recordsError;

  const uris = getSpotifyTrackUris(records ?? []);
  if (uris.length === 0) {
    throw new SpotifyPlaylistExportError(
      "이 달에는 Spotify로 내보낼 음악이 없어요.",
      "EMPTY_SPOTIFY_RECAP",
      422,
    );
  }

  const nowIso = now.toISOString();
  if (existing) {
    const leaseIsActive = (
      existing.status === "creating"
      && new Date(existing.updated_at).getTime() > now.getTime() - EXPORT_LEASE_MS
    );
    if (leaseIsActive) {
      throw new SpotifyPlaylistExportError(
        "같은 달의 플레이리스트를 만들고 있어요. 잠시 후 다시 시도해 주세요.",
        "SPOTIFY_PLAYLIST_EXPORT_IN_PROGRESS",
        409,
      );
    }

    let claim = admin
      .from("spotify_playlist_exports")
      .update({ status: "creating", track_count: uris.length, updated_at: nowIso })
      .eq("user_id", userId)
      .eq("recap_year", year)
      .eq("recap_month", month)
      .eq("status", existing.status);
    if (existing.updated_at) claim = claim.eq("updated_at", existing.updated_at);
    const { data: claimed, error: claimError } = await claim
      .select("spotify_playlist_id, spotify_playlist_url")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      throw new SpotifyPlaylistExportError(
        "같은 달의 플레이리스트를 만들고 있어요. 잠시 후 다시 시도해 주세요.",
        "SPOTIFY_PLAYLIST_EXPORT_IN_PROGRESS",
        409,
      );
    }
    existing = { ...existing, ...claimed, status: "creating", updated_at: nowIso };
  } else {
    const { error: claimError } = await admin.from("spotify_playlist_exports").insert({
      user_id: userId,
      recap_year: year,
      recap_month: month,
      track_count: uris.length,
      status: "creating",
      updated_at: nowIso,
    });
    if (claimError) {
      if (claimError.code === "23505") {
        const concurrent = await findExistingExport(admin, userId, year, month);
        if (concurrent?.status === "completed" && concurrent.spotify_playlist_url) {
          return mapExport(concurrent, true);
        }
        throw new SpotifyPlaylistExportError(
          "같은 달의 플레이리스트를 만들고 있어요. 잠시 후 다시 시도해 주세요.",
          "SPOTIFY_PLAYLIST_EXPORT_IN_PROGRESS",
          409,
        );
      }
      throw claimError;
    }
  }

  try {
    let spotifyAccessToken;
    try {
      spotifyAccessToken = await getUserAccessToken(admin, userId, oauthOptions);
    } catch (error) {
    if (error instanceof SpotifyOAuthConfigurationError) {
      throw new SpotifyPlaylistExportError(
        "Spotify 연결 설정을 확인해 주세요.",
        "SPOTIFY_OAUTH_NOT_CONFIGURED",
        503,
      );
    }
    if (error instanceof SpotifyOAuthProviderError) {
      throw new SpotifyPlaylistExportError(
        error.code === "not_connected"
          ? "Spotify 계정을 먼저 연결해 주세요."
          : "Spotify 플레이리스트 권한을 다시 확인해 주세요.",
        error.code === "not_connected" ? "SPOTIFY_NOT_CONNECTED" : "SPOTIFY_PLAYLIST_FORBIDDEN",
        error.code === "not_connected" ? 409 : 403,
      );
    }
      throw error;
    }

  const headers = {
    Authorization: `Bearer ${spotifyAccessToken}`,
    "Content-Type": "application/json",
  };
  let playlist = existing?.spotify_playlist_id && existing.spotify_playlist_url
    ? {
        id: existing.spotify_playlist_id,
        external_urls: { spotify: existing.spotify_playlist_url },
      }
    : null;
  const isRecovery = Boolean(playlist);

  if (!playlist) {
    const createResponse = await requestSpotify(`${SPOTIFY_API_URL}/me/playlists`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: `${year}년 ${month}월, SWIM Music Diary`,
        description: "SWIM에서 기록한 한 달의 음악 일기",
        public: false,
      }),
    }, fetchImpl);
    playlist = await createResponse.json().catch(() => null);
    if (
      typeof playlist?.id !== "string"
      || typeof playlist?.external_urls?.spotify !== "string"
    ) {
      throw new SpotifyPlaylistExportError(
        "Spotify 플레이리스트 응답을 확인하지 못했어요.",
        "INVALID_SPOTIFY_RESPONSE",
        502,
      );
    }

    const { error: playlistSaveError } = await admin
      .from("spotify_playlist_exports")
      .update({
        spotify_playlist_id: playlist.id,
        spotify_playlist_url: playlist.external_urls.spotify,
        updated_at: nowIso,
      })
      .eq("user_id", userId)
      .eq("recap_year", year)
      .eq("recap_month", month)
      .eq("status", "creating");
    if (playlistSaveError) throw playlistSaveError;
  }

  for (let index = 0; index < uris.length; index += TRACK_BATCH_SIZE) {
    await requestSpotify(`${SPOTIFY_API_URL}/playlists/${encodeURIComponent(playlist.id)}/items`, {
      method: isRecovery && index === 0 ? "PUT" : "POST",
      headers,
      body: JSON.stringify({ uris: uris.slice(index, index + TRACK_BATCH_SIZE) }),
    }, fetchImpl);
  }

  const exportRow = {
    user_id: userId,
    recap_year: year,
    recap_month: month,
    spotify_playlist_id: playlist.id,
    spotify_playlist_url: playlist.external_urls.spotify,
    track_count: uris.length,
  };
  const { data: saved, error: saveError } = await admin
    .from("spotify_playlist_exports")
    .update({ ...exportRow, status: "completed", updated_at: nowIso })
    .eq("user_id", userId)
    .eq("recap_year", year)
    .eq("recap_month", month)
    .select("recap_year, recap_month, spotify_playlist_url, track_count")
    .single();
  if (saveError) throw saveError;

  if (!saved?.spotify_playlist_url) throw new Error("Spotify playlist export was not saved");
    return mapExport(saved, false);
  } catch (error) {
    const { error: recoverySaveError } = await admin
      .from("spotify_playlist_exports")
      .update({ status: "failed", updated_at: nowIso })
      .eq("user_id", userId)
      .eq("recap_year", year)
      .eq("recap_month", month)
      .eq("status", "creating");
    if (recoverySaveError) {
      console.error("Failed to preserve Spotify playlist export recovery:", recoverySaveError);
    }
    throw error;
  }
}
