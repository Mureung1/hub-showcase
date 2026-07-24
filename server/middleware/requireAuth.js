import { getSupabaseClient } from "../lib/supabase.js";

function sendUnauthorized(response) {
  return response.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "로그인이 필요합니다.",
    },
  });
}

export function createRequireAuth(getSupabase = getSupabaseClient) {
  return async function requireAuth(request, response, next) {
    const authorization = request.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);
    const accessToken = match?.[1]?.trim();

    if (!accessToken) {
      return sendUnauthorized(response);
    }

    try {
      const { data, error } = await getSupabase().auth.getUser(accessToken);

      if (error || !data.user) {
        return sendUnauthorized(response);
      }

      request.auth = {
        accessToken,
        user: data.user,
      };
      return next();
    } catch (error) {
      console.error("Failed to verify auth token:", error instanceof Error ? error.message : error);
      return response.status(500).json({
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "로그인 상태를 확인하지 못했습니다.",
        },
      });
    }
  };
}
