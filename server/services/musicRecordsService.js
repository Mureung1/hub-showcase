import { getLikeCounts, getLikedRecordIds } from "./likesService.js";

export const recordColumns = [
  "id",
  "user_id",
  "spotify_track_id",
  "song_title",
  "artist_name",
  "album_name",
  "album_image_url",
  "external_url",
  "emotion_text",
  "record_date",
  "created_at",
  "author:profiles!music_records_user_id_fkey(id, nickname, avatar_url)",
].join(", ");

export class MusicRecordValidationError extends Error {}

export function mapMusicRecord(record, liked = false, likeCount = 0) {
  return {
    id: record.id,
    userId: record.user_id,
    spotifyTrackId: record.spotify_track_id ?? null,
    songTitle: record.song_title,
    artistName: record.artist_name,
    albumName: record.album_name ?? null,
    albumImageUrl: record.album_image_url ?? null,
    externalUrl: record.external_url ?? null,
    emotionText: record.emotion_text,
    recordDate: record.record_date,
    createdAt: record.created_at,
    liked,
    likeCount,
    author: record.author
      ? {
          id: record.author.id,
          nickname: record.author.nickname,
          avatarUrl: record.author.avatar_url ?? null,
        }
      : null,
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

export async function listMusicRecords(supabase, userId) {
  const { data, error } = await supabase
    .from("music_records")
    .select(recordColumns)
    .eq("user_id", userId)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  const records = data ?? [];
  const likedRecordIds = await getLikedRecordIds(
    supabase,
    userId,
    records.map((record) => record.id),
  );
  const likeCounts = await getLikeCounts(
    supabase,
    records.map((record) => record.id),
  );

  return records.map((record) => mapMusicRecord(
    record,
    likedRecordIds.has(record.id),
    likeCounts.get(String(record.id)) ?? 0,
  ));
}

export async function createMusicRecord(supabase, userId, body, getToday = getCurrentDate) {
  if (!isValidCreateBody(body)) {
    throw new MusicRecordValidationError("필수 입력값을 확인해주세요.");
  }

  const { data, error } = await supabase
    .from("music_records")
    .insert({
      user_id: userId,
      spotify_track_id: getOptionalText(body.spotifyTrackId),
      song_title: body.songTitle.trim(),
      artist_name: body.artistName.trim(),
      album_name: getOptionalText(body.albumName),
      album_image_url: getOptionalText(body.albumImageUrl),
      external_url: getOptionalText(body.externalUrl),
      emotion_text: body.emotionText.trim(),
      record_date: getToday(),
    })
    .select(recordColumns)
    .single();

  if (error) throw error;
  return mapMusicRecord(data, false, 0);
}
