import { getAuthenticatedSupabaseClient } from "../lib/supabase.js";
import {
  FollowTargetError,
  followUser,
  unfollowUser,
} from "../services/followsService.js";

function sendInvalidTarget(response) {
  return response.status(400).json({
    error: {
      code: "INVALID_FOLLOW_TARGET",
      message: "팔로우할 사용자 닉네임을 확인해 주세요.",
    },
  });
}

function sendError(response, error) {
  if (error instanceof FollowTargetError) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }

  console.error("Failed to update follow:", error instanceof Error ? error.message : error);
  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "팔로우 상태 변경 중 오류가 발생했습니다.",
    },
  });
}

function normalizeFollowingNickname(value) {
  if (typeof value !== "string") return null;

  const nickname = value.trim();
  return nickname.length >= 2 && nickname.length <= 20 ? nickname : null;
}

export function createFollowsController(
  getAuthenticatedSupabase = getAuthenticatedSupabaseClient,
) {
  return {
    async create(request, response) {
      const followingNickname = normalizeFollowingNickname(request.body?.followingNickname);
      if (!followingNickname) return sendInvalidTarget(response);

      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const follow = await followUser(
          supabase,
          request.auth.user.id,
          followingNickname,
        );
        return response.status(200).json({ data: follow });
      } catch (error) {
        return sendError(response, error);
      }
    },

    async remove(request, response) {
      const followingNickname = normalizeFollowingNickname(request.params.followingNickname);
      if (!followingNickname) return sendInvalidTarget(response);

      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const follow = await unfollowUser(
          supabase,
          request.auth.user.id,
          followingNickname,
        );
        return response.status(200).json({ data: follow });
      } catch (error) {
        return sendError(response, error);
      }
    },
  };
}
