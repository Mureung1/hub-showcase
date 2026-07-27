import { mapMusicRecord, recordColumns } from "./musicRecordsService.js";
import { getLikeCounts, getLikedRecordIds } from "./likesService.js";

function mapFeedRecord(record, liked, likeCount) {
  const mapped = mapMusicRecord(record, liked, likeCount);

  return {
    id: mapped.id,
    spotifyTrackId: mapped.spotifyTrackId,
    songTitle: mapped.songTitle,
    artistName: mapped.artistName,
    albumName: mapped.albumName,
    albumImageUrl: mapped.albumImageUrl,
    externalUrl: mapped.externalUrl,
    emotionText: mapped.emotionText,
    recordDate: mapped.recordDate,
    createdAt: mapped.createdAt,
    liked: mapped.liked,
    likeCount: mapped.likeCount,
    author: mapped.author
      ? {
          nickname: mapped.author.nickname,
          avatarUrl: mapped.author.avatarUrl,
        }
      : null,
  };
}

export async function listFollowingFeed(supabase, currentUserId) {
  const { data: follows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId);

  if (followsError) throw followsError;

  const followingIds = [...new Set((follows ?? []).map((follow) => follow.following_id))];
  if (followingIds.length === 0) {
    return { records: [], followingCount: 0 };
  }

  const { data: records, error: recordsError } = await supabase
    .from("music_records")
    .select(recordColumns)
    .in("user_id", followingIds)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (recordsError) throw recordsError;

  const feedRecords = records ?? [];
  const likedRecordIds = await getLikedRecordIds(
    supabase,
    currentUserId,
    feedRecords.map((record) => record.id),
  );
  const likeCounts = await getLikeCounts(
    supabase,
    feedRecords.map((record) => record.id),
  );

  return {
    records: feedRecords.map((record) => mapFeedRecord(
      record,
      likedRecordIds.has(record.id),
      likeCounts.get(String(record.id)) ?? 0,
    )),
    followingCount: followingIds.length,
  };
}
