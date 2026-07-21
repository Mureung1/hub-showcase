import { Router } from "express";
import { getSupabaseClient } from "../lib/supabase.js";

const recordColumns = [
  "id",
  "spotify_track_id",
  "song_title",
  "artist_name",
  "album_name",
  "album_image_url",
  "external_url",
  "emotion_text",
  "record_date",
  "created_at",
].join(", ");

export function mapMusicRecord(record) {
  return {
    id: record.id,
    spotifyTrackId: record.spotify_track_id ?? null,
    songTitle: record.song_title,
    artistName: record.artist_name,
    albumName: record.album_name ?? null,
    albumImageUrl: record.album_image_url ?? null,
    externalUrl: record.external_url ?? null,
    emotionText: record.emotion_text,
    recordDate: record.record_date,
    createdAt: record.created_at,
  };
}

export function getCurrentDate() {
  const timeZone = process.env.APP_TIME_ZONE || "Asia/Seoul";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidCreateBody(body) {
  return [body?.songTitle, body?.artistName, body?.emotionText].every(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

function getOptionalText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function sendInternalError(response, message) {
  return response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  });
}

export function createMusicRecordsRouter(
  getSupabase = getSupabaseClient,
  getToday = getCurrentDate,
) {
  const router = Router();

  router.get("/", async (_request, response) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("music_records")
        .select(recordColumns)
        .order("record_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      response.status(200).json({ data: (data ?? []).map(mapMusicRecord) });
    } catch (error) {
      console.error("Failed to fetch music records:", error instanceof Error ? error.message : error);
      sendInternalError(response, "음악 기록 조회 중 오류가 발생했습니다.");
    }
  });

  router.post("/", async (request, response) => {
    if (!isValidCreateBody(request.body)) {
      return response.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: "필수 입력값을 확인해주세요.",
        },
      });
    }

    const songTitle = request.body.songTitle.trim();
    const artistName = request.body.artistName.trim();
    const emotionText = request.body.emotionText.trim();

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("music_records")
        .insert({
          spotify_track_id: getOptionalText(request.body.spotifyTrackId),
          song_title: songTitle,
          artist_name: artistName,
          album_name: getOptionalText(request.body.albumName),
          album_image_url: getOptionalText(request.body.albumImageUrl),
          external_url: getOptionalText(request.body.externalUrl),
          emotion_text: emotionText,
          record_date: getToday(),
        })
        .select(recordColumns)
        .single();

      if (error) throw error;

      return response.status(201).json({ data: mapMusicRecord(data) });
    } catch (error) {
      console.error("Failed to create a music record:", error instanceof Error ? error.message : error);
      return sendInternalError(response, "음악 기록 저장 중 오류가 발생했습니다.");
    }
  });

  return router;
}
