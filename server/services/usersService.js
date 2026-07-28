function mapUser(profile, followingIds) {
  return {
    nickname: profile.nickname,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatar_url ?? null,
    isFollowing: followingIds.has(profile.id),
  };
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listUsers(supabase, currentUserId, searchQuery = null) {
  let profilesQuery = supabase
    .from("profiles")
    .select("id, nickname, bio, avatar_url")
    .neq("id", currentUserId);

  if (searchQuery) {
    profilesQuery = profilesQuery.ilike(
      "nickname",
      `%${escapeLikePattern(searchQuery)}%`,
    );
  }

  const { data: profiles, error: profilesError } = await profilesQuery
    .order("nickname", { ascending: true });

  if (profilesError) throw profilesError;

  const { data: follows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId);

  if (followsError) throw followsError;

  const followingIds = new Set((follows ?? []).map((follow) => follow.following_id));
  return (profiles ?? []).map((profile) => mapUser(profile, followingIds));
}

export class UserProfileNotFoundError extends Error {}
export class UserDiaryCursorError extends Error {}

async function findProfileByNickname(supabase, nickname) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, nickname, bio, avatar_url")
    .ilike("nickname", escapeLikePattern(nickname))
    .maybeSingle();

  if (error) throw error;
  if (!profile) throw new UserProfileNotFoundError();
  return profile;
}

export async function getUserProfile(supabase, currentUserId, nickname) {
  const profile = await findProfileByNickname(supabase, nickname);

  const { data: follow, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId)
    .eq("following_id", profile.id)
    .maybeSingle();

  if (followError) throw followError;

  return {
    nickname: profile.nickname,
    bio: profile.bio ?? "",
    avatarUrl: profile.avatar_url ?? null,
    isMe: profile.id === currentUserId,
    isFollowing: Boolean(follow),
  };
}

const publicRecordColumns = [
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

function encodeDiaryCursor(record) {
  return Buffer.from(JSON.stringify({
    recordDate: record.record_date,
    createdAt: record.created_at,
    id: String(record.id),
  }), "utf8").toString("base64url");
}

function decodeDiaryCursor(cursor) {
  if (cursor === undefined) return null;
  if (typeof cursor !== "string" || cursor.length === 0) {
    throw new UserDiaryCursorError();
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(parsed.recordDate)
      || !/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z?$/.test(parsed.createdAt)
      || Number.isNaN(Date.parse(parsed.createdAt))
      || !/^[1-9]\d*$/.test(parsed.id)
      || Object.keys(parsed).length !== 3
    ) {
      throw new UserDiaryCursorError();
    }
    return parsed;
  } catch (error) {
    if (error instanceof UserDiaryCursorError) throw error;
    throw new UserDiaryCursorError();
  }
}

function getDiaryCursorFilter(cursor) {
  return [
    `record_date.lt.${cursor.recordDate}`,
    `and(record_date.eq.${cursor.recordDate},created_at.lt.${cursor.createdAt})`,
    `and(record_date.eq.${cursor.recordDate},created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  ].join(",");
}

function mapPublicRecord(record, profile, likedRecordIds, likeCounts) {
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
    liked: likedRecordIds.has(record.id),
    likeCount: likeCounts.get(String(record.id)) ?? 0,
    author: {
      nickname: profile.nickname,
      avatarUrl: profile.avatar_url ?? null,
    },
  };
}

export async function listUserMusicRecords(
  supabase,
  currentUserId,
  nickname,
  cursor,
  getToday,
) {
  const profile = await findProfileByNickname(supabase, nickname);
  const decodedCursor = decodeDiaryCursor(cursor);
  const today = getToday();

  const { data: todayRecord, error: todayError } = await supabase
    .from("music_records")
    .select(publicRecordColumns)
    .eq("user_id", profile.id)
    .eq("record_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (todayError) throw todayError;

  let pastQuery = supabase
    .from("music_records")
    .select(publicRecordColumns)
    .eq("user_id", profile.id)
    .lt("record_date", today);

  if (decodedCursor) {
    pastQuery = pastQuery.or(getDiaryCursorFilter(decodedCursor));
  }

  const { data: pastRows, error: pastError } = await pastQuery
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PUBLIC_DIARY_PAGE_SIZE + 1);

  if (pastError) throw pastError;

  const rows = pastRows ?? [];
  const pastRecords = rows.slice(0, PUBLIC_DIARY_PAGE_SIZE);
  const recordsForState = [
    ...(todayRecord ? [todayRecord] : []),
    ...pastRecords,
  ];
  const recordIds = recordsForState.map((record) => record.id);
  const [likedRecordIds, likeCounts] = await Promise.all([
    getLikedRecordIds(supabase, currentUserId, recordIds),
    getLikeCounts(supabase, recordIds),
  ]);

  return {
    todayRecord: todayRecord
      ? mapPublicRecord(todayRecord, profile, likedRecordIds, likeCounts)
      : null,
    records: pastRecords.map((record) => (
      mapPublicRecord(record, profile, likedRecordIds, likeCounts)
    )),
    nextCursor: rows.length > PUBLIC_DIARY_PAGE_SIZE
      ? encodeDiaryCursor(pastRecords.at(-1))
      : null,
  };
}
import { getLikeCounts, getLikedRecordIds } from "./likesService.js";

const PUBLIC_DIARY_PAGE_SIZE = 20;
