import { getAuthenticatedSupabaseClient } from "../lib/supabase.js";
import {
  LikeTargetError,
  LikeCursorError,
  likeMusicRecord,
  listMusicRecordLikeUsers,
  unlikeMusicRecord,
} from "../services/likesService.js";

const maxBigint = 9223372036854775807n;

function normalizeRecordId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;

  try {
    const recordId = BigInt(value);
    return recordId <= maxBigint ? recordId.toString() : null;
  } catch {
    return null;
  }
}

function sendError(
  response,
  error,
  internalMessage = "좋아요 상태 변경 중 오류가 발생했습니다.",
  logAction = "update like",
) {
  if (error instanceof LikeTargetError || error instanceof LikeCursorError) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }

  console.error(`Failed to ${logAction}:`, error instanceof Error ? error.message : error);
  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: internalMessage,
    },
  });
}

function sendInvalidRecordId(response) {
  return response.status(400).json({
    error: {
      code: "INVALID_RECORD_ID",
      message: "음악 기록 ID를 확인해 주세요.",
    },
  });
}

export function createLikesController(
  getAuthenticatedSupabase = getAuthenticatedSupabaseClient,
) {
  async function update(request, response, action) {
    const recordId = normalizeRecordId(request.params.recordId);
    if (!recordId) return sendInvalidRecordId(response);

    try {
      const supabase = getAuthenticatedSupabase(request.auth.accessToken);
      const like = await action(supabase, request.auth.user.id, recordId);
      return response.status(200).json({ data: like });
    } catch (error) {
      return sendError(response, error);
    }
  }

  return {
    async list(request, response) {
      const recordId = normalizeRecordId(request.params.recordId);
      if (!recordId) return sendInvalidRecordId(response);
      if (
        request.query.cursor !== undefined
        && typeof request.query.cursor !== "string"
      ) {
        return sendError(response, new LikeCursorError());
      }

      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const result = await listMusicRecordLikeUsers(
          supabase,
          recordId,
          typeof request.query.cursor === "string" ? request.query.cursor : null,
        );
        return response.status(200).json({ data: result });
      } catch (error) {
        return sendError(
          response,
          error,
          "좋아요 사용자 목록 조회 중 오류가 발생했습니다.",
          "fetch like users",
        );
      }
    },

    create(request, response) {
      return update(request, response, likeMusicRecord);
    },
    remove(request, response) {
      return update(request, response, unlikeMusicRecord);
    },
  };
}
