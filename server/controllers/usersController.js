import { getAuthenticatedSupabaseClient } from "../lib/supabase.js";
import {
  getUserProfile,
  listUserMusicRecords,
  listUsers,
  UserDiaryCursorError,
  UserProfileNotFoundError,
} from "../services/usersService.js";
import { getCurrentDate } from "../services/musicRecordsService.js";

const MIN_SEARCH_LENGTH = 2;

export class UsersQueryValidationError extends Error {}

export function normalizeUserSearchQuery(value) {
  if (value === undefined) return null;

  if (typeof value !== "string") {
    throw new UsersQueryValidationError("검색어 형식을 확인해 주세요.");
  }

  const normalizedQuery = value.trim();
  if (normalizedQuery.length < MIN_SEARCH_LENGTH) {
    throw new UsersQueryValidationError("검색어는 2자 이상 입력해 주세요.");
  }

  if (normalizedQuery.length > 20) {
    throw new UsersQueryValidationError("검색어는 20자 이하로 입력해 주세요.");
  }

  return normalizedQuery;
}

export function createUsersController(
  getAuthenticatedSupabase = getAuthenticatedSupabaseClient,
  getToday = getCurrentDate,
) {
  return {
    async musicRecords(request, response) {
      const nickname = request.params.nickname?.trim();
      if (!nickname || nickname.length < 2 || nickname.length > 20) {
        return response.status(400).json({
          error: { code: "INVALID_NICKNAME", message: "닉네임을 확인해 주세요." },
        });
      }

      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const page = await listUserMusicRecords(
          supabase,
          request.auth.user.id,
          nickname,
          request.query.cursor,
          getToday,
        );
        return response.status(200).json({ data: page });
      } catch (error) {
        if (error instanceof UserProfileNotFoundError) {
          return response.status(404).json({
            error: { code: "USER_NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
          });
        }
        if (error instanceof UserDiaryCursorError) {
          return response.status(400).json({
            error: { code: "INVALID_CURSOR", message: "페이지 정보를 확인해 주세요." },
          });
        }
        console.error("Failed to fetch user music records:", error instanceof Error ? error.message : error);
        return response.status(500).json({
          error: { code: "INTERNAL_SERVER_ERROR", message: "음악 다이어리 조회 중 오류가 발생했습니다." },
        });
      }
    },
    async detail(request, response) {
      const nickname = request.params.nickname?.trim();
      if (!nickname || nickname.length < 2 || nickname.length > 20) {
        return response.status(400).json({
          error: { code: "INVALID_NICKNAME", message: "닉네임을 확인해 주세요." },
        });
      }

      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const profile = await getUserProfile(supabase, request.auth.user.id, nickname);
        return response.status(200).json({ data: profile });
      } catch (error) {
        if (error instanceof UserProfileNotFoundError) {
          return response.status(404).json({
            error: { code: "USER_NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
          });
        }
        console.error("Failed to fetch user profile:", error instanceof Error ? error.message : error);
        return response.status(500).json({
          error: { code: "INTERNAL_SERVER_ERROR", message: "프로필 조회 중 오류가 발생했습니다." },
        });
      }
    },
    async list(request, response) {
      try {
        const searchQuery = normalizeUserSearchQuery(request.query.q);
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const users = await listUsers(supabase, request.auth.user.id, searchQuery);
        return response.status(200).json({ data: users });
      } catch (error) {
        if (error instanceof UsersQueryValidationError) {
          return response.status(400).json({
            error: {
              code: "INVALID_SEARCH_QUERY",
              message: error.message,
            },
          });
        }

        console.error("Failed to fetch users:", error instanceof Error ? error.message : error);
        return response.status(500).json({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "사용자 목록 조회 중 오류가 발생했습니다.",
          },
        });
      }
    },
  };
}
