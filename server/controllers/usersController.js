import { getAuthenticatedSupabaseClient } from "../lib/supabase.js";
import { listUsers } from "../services/usersService.js";

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
) {
  return {
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
