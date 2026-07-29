import { getAuthenticatedSupabaseClient, getSupabaseAdminClient } from "../lib/supabase.js";
import {
  exportMonthlyRecapPlaylist,
  SpotifyPlaylistExportError,
} from "../services/spotifyPlaylistService.js";

function parseMonth(body) {
  const year = body?.year;
  const month = body?.month;
  if (
    !Number.isInteger(year)
    || year < 2000
    || year > 9999
    || !Number.isInteger(month)
    || month < 1
    || month > 12
  ) return null;
  return { year, month };
}

export function createSpotifyPlaylistController(options = {}) {
  const getAdminSupabase = options.getAdminSupabase ?? getSupabaseAdminClient;
  const getAuthenticatedSupabase = options.getAuthenticatedSupabase
    ?? getAuthenticatedSupabaseClient;
  const exportPlaylist = options.exportMonthlyRecapPlaylist ?? exportMonthlyRecapPlaylist;

  return {
    async create(request, response) {
      const recapMonth = parseMonth(request.body);
      if (!recapMonth) {
        return response.status(400).json({
          error: {
            code: "INVALID_RECAP_MONTH",
            message: "내보낼 연도와 월을 확인해 주세요.",
          },
        });
      }

      try {
        const data = await exportPlaylist(
          getAdminSupabase(),
          getAuthenticatedSupabase(request.auth.accessToken),
          request.auth.user.id,
          recapMonth.year,
          recapMonth.month,
          {
            fetchImpl: options.fetchImpl,
            getUserAccessToken: options.getSpotifyUserAccessToken,
            oauthOptions: {
              env: options.env,
              fetchImpl: options.fetchImpl,
              now: options.now,
              randomBytesFn: options.randomBytesFn,
            },
            now: options.now ?? new Date(),
          },
        );
        return response.status(data.reused ? 200 : 201).json({ data });
      } catch (error) {
        if (error instanceof SpotifyPlaylistExportError) {
          if (error.retryAfter) response.set("Retry-After", error.retryAfter);
          return response.status(error.status).json({
            error: { code: error.code, message: error.message },
          });
        }
        console.error("Failed to export Spotify playlist:", error instanceof Error ? error.message : error);
        return response.status(500).json({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Spotify 플레이리스트를 만드는 중 오류가 발생했습니다.",
          },
        });
      }
    },
  };
}
