import { getAuthenticatedSupabaseClient } from "../lib/supabase.js";
import {
  createMusicRecord,
  getCurrentDate,
  listMusicRecords,
  MusicRecordValidationError,
} from "../services/musicRecordsService.js";

function sendInternalError(response, message) {
  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  });
}

export function createMusicRecordsController(
  getAuthenticatedSupabase = getAuthenticatedSupabaseClient,
  getToday = getCurrentDate,
) {
  return {
    async list(request, response) {
      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const records = await listMusicRecords(supabase, request.auth.user.id);
        return response.status(200).json({ data: records });
      } catch (error) {
        console.error("Failed to fetch music records:", error instanceof Error ? error.message : error);
        return sendInternalError(response, "음악 기록 조회 중 오류가 발생했습니다.");
      }
    },

    async create(request, response) {
      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const record = await createMusicRecord(
          supabase,
          request.auth.user.id,
          request.body,
          getToday,
        );
        return response.status(201).json({ data: record });
      } catch (error) {
        if (error instanceof MusicRecordValidationError) {
          return response.status(400).json({
            error: {
              code: "INVALID_INPUT",
              message: error.message,
            },
          });
        }

        console.error("Failed to create a music record:", error instanceof Error ? error.message : error);
        return sendInternalError(response, "음악 기록 저장 중 오류가 발생했습니다.");
      }
    },
  };
}
