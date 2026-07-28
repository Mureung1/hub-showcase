import { getAuthenticatedSupabaseClient } from "../lib/supabase.js";
import { getMonthlyRecap } from "../services/recapsService.js";

function parseYear(value) {
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 1 ? year : null;
}

function parseMonth(value) {
  return typeof value === "string" && /^(?:[1-9]|1[0-2])$/.test(value)
    ? Number(value)
    : null;
}

export function createRecapsController(
  getAuthenticatedSupabase = getAuthenticatedSupabaseClient,
) {
  return {
    async monthly(request, response) {
      const year = parseYear(request.query.year);
      const month = parseMonth(request.query.month);

      if (year === null || month === null) {
        return response.status(400).json({
          error: {
            code: "INVALID_RECAP_MONTH",
            message: "조회할 연도와 월을 확인해주세요.",
          },
        });
      }

      try {
        const supabase = getAuthenticatedSupabase(request.auth.accessToken);
        const recap = await getMonthlyRecap(
          supabase,
          request.auth.user.id,
          year,
          month,
        );
        return response.status(200).json({ data: recap });
      } catch (error) {
        console.error(
          "Failed to fetch monthly recap:",
          error instanceof Error ? error.message : error,
        );
        return response.status(500).json({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "월간 기록을 정리하는 중 오류가 발생했습니다.",
          },
        });
      }
    },
  };
}
