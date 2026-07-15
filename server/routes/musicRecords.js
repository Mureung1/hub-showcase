import { Router } from "express";
import { getSupabaseClient } from "../lib/supabase.js";

export function mapMusicRecord(record) {
  return {
    id: record.id,
    songTitle: record.song_title,
    artistName: record.artist_name,
    emotionText: record.emotion_text,
    recordDate: record.record_date,
    createdAt: record.created_at,
  };
}

export function createMusicRecordsRouter(getSupabase = getSupabaseClient) {
  const router = Router();

  router.get("/", async (_request, response) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("music_records")
        .select("id, song_title, artist_name, emotion_text, record_date, created_at")
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      response.status(200).json({ data: (data ?? []).map(mapMusicRecord) });
    } catch (error) {
      console.error("Failed to fetch music records:", error instanceof Error ? error.message : error);
      response.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "음악 기록 조회 중 오류가 발생했습니다.",
        },
      });
    }
  });

  return router;
}
