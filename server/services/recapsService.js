const recapRecordColumns = [
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

function padMonth(month) {
  return String(month).padStart(2, "0");
}

export function getMonthRange(year, month) {
  const startDate = `${year}-${padMonth(month)}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    startDate,
    endDate: `${nextYear}-${padMonth(nextMonth)}-01`,
  };
}

function mapRecapTrack(record) {
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
  };
}

function getTopArtists(records) {
  const counts = new Map();

  records.forEach((record) => {
    counts.set(record.artist_name, (counts.get(record.artist_name) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([artistName, recordCount]) => ({ artistName, recordCount }))
    .sort((left, right) => (
      right.recordCount - left.recordCount
      || left.artistName.localeCompare(right.artistName, "ko")
    ))
    .slice(0, 3);
}

export function buildMonthlyRecap(year, month, records) {
  const tracks = records.map(mapRecapTrack);
  const recordDays = new Set(records.map((record) => record.record_date)).size;

  return {
    year,
    month,
    recordCount: records.length,
    recordDays,
    topArtists: getTopArtists(records),
    firstRecord: tracks[0] ?? null,
    lastRecord: tracks.at(-1) ?? null,
    tracks,
  };
}

export async function getMonthlyRecap(supabase, userId, year, month) {
  const { startDate, endDate } = getMonthRange(year, month);
  const { data, error } = await supabase
    .from("music_records")
    .select(recapRecordColumns)
    .eq("user_id", userId)
    .gte("record_date", startDate)
    .lt("record_date", endDate)
    .order("record_date", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return buildMonthlyRecap(year, month, data ?? []);
}
