import { getAuthenticatedSupabaseClient } from "../lib/supabase.js";
import { listFollowingFeed } from "../services/feedService.js";

export function createFeedController(
  getAuthenticatedSupabase = getAuthenticatedSupabaseClient,
) {
  return {
    async list(request, response) {
      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const feed = await listFollowingFeed(supabase, request.auth.user.id);

        return response.status(200).json({
          data: feed.records,
          meta: { followingCount: feed.followingCount },
        });
      } catch (error) {
        console.error("Failed to fetch following feed:", error instanceof Error ? error.message : error);
        return response.status(500).json({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "팔로잉 피드를 불러오는 중 오류가 발생했습니다.",
          },
        });
      }
    },
  };
}

