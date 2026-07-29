import { getSupabaseAdminClient } from "../lib/supabase.js";
import {
  completeSpotifyAuthorization,
  createSpotifyAuthorization,
  disconnectSpotify,
  getSpotifyConnection,
  SpotifyOAuthConfigurationError,
  SpotifyOAuthProviderError,
  SpotifyOAuthStateError,
} from "../services/spotifyOAuthService.js";

function sendInternalError(response) {
  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Spotify 연결을 처리하는 중 오류가 발생했습니다.",
    },
  });
}

function getFrontendRedirect(status, reason, env = process.env) {
  const url = new URL(env.APP_FRONTEND_URL || "http://localhost:5173");
  url.searchParams.set("spotify", status);
  if (reason) url.searchParams.set("reason", reason);
  return url.toString();
}

export function createSpotifyOAuthController(options = {}) {
  const getAdminSupabase = options.getAdminSupabase ?? getSupabaseAdminClient;

  return {
    async connect(request, response) {
      try {
        const data = await createSpotifyAuthorization(
          getAdminSupabase(),
          request.auth.user.id,
          options,
        );
        return response.status(200).json({ data });
      } catch (error) {
        if (error instanceof SpotifyOAuthConfigurationError) {
          return response.status(503).json({
            error: {
              code: "SPOTIFY_OAUTH_NOT_CONFIGURED",
              message: "Spotify 연결 설정을 확인해주세요.",
            },
          });
        }
        console.error("Failed to start Spotify OAuth:", error instanceof Error ? error.message : error);
        return sendInternalError(response);
      }
    },

    async callback(request, response) {
      try {
        await completeSpotifyAuthorization(
          getAdminSupabase(),
          {
            state: request.query.state,
            code: request.query.code,
            providerError: request.query.error,
          },
          options,
        );
        return response.redirect(302, getFrontendRedirect("connected", null, options.env));
      } catch (error) {
        const reason = error instanceof SpotifyOAuthStateError
          ? "invalid_state"
          : error instanceof SpotifyOAuthProviderError
            ? error.code
            : error instanceof SpotifyOAuthConfigurationError
              ? "configuration"
              : "server_error";
        if (!(error instanceof SpotifyOAuthProviderError)) {
          console.error("Failed to complete Spotify OAuth:", error instanceof Error ? error.message : error);
        }
        return response.redirect(302, getFrontendRedirect("error", reason, options.env));
      }
    },

    async connection(request, response) {
      try {
        const data = await getSpotifyConnection(
          getAdminSupabase(),
          request.auth.user.id,
        );
        return response.status(200).json({ data });
      } catch (error) {
        console.error("Failed to fetch Spotify connection:", error instanceof Error ? error.message : error);
        return sendInternalError(response);
      }
    },

    async disconnect(request, response) {
      try {
        const data = await disconnectSpotify(
          getAdminSupabase(),
          request.auth.user.id,
        );
        return response.status(200).json({ data });
      } catch (error) {
        console.error("Failed to disconnect Spotify:", error instanceof Error ? error.message : error);
        return sendInternalError(response);
      }
    },
  };
}
