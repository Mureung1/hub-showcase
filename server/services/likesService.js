export async function getLikedRecordIds(supabase, currentUserId, recordIds) {
  if (recordIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("likes")
    .select("record_id")
    .eq("user_id", currentUserId)
    .in("record_id", recordIds);

  if (error) throw error;
  return new Set((data ?? []).map((like) => like.record_id));
}

export async function getLikeCounts(supabase, recordIds) {
  if (recordIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc(
    "get_music_record_like_counts",
    { p_record_ids: recordIds },
  );

  if (error) throw error;
  return new Map((data ?? []).map((row) => [
    String(row.record_id),
    Number(row.like_count),
  ]));
}

export class LikeTargetError extends Error {
  constructor() {
    super("좋아요할 음악 기록을 찾을 수 없습니다.");
    this.code = "MUSIC_RECORD_NOT_FOUND";
    this.status = 404;
  }
}

export class LikeCursorError extends Error {
  constructor() {
    super("좋아요 목록 커서를 확인해 주세요.");
    this.code = "INVALID_LIKE_CURSOR";
    this.status = 400;
  }
}

export async function ensureRecordExists(supabase, recordId) {
  const { data, error } = await supabase
    .from("music_records")
    .select("id")
    .eq("id", recordId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new LikeTargetError();
}

function encodeCursor(user) {
  return Buffer.from(JSON.stringify({
    nickname: user.nickname,
  })).toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor) return null;

  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof value.nickname !== "string"
      || value.nickname.length < 2
      || value.nickname.length > 20
    ) {
      throw new Error("invalid cursor");
    }
    return value;
  } catch {
    throw new LikeCursorError();
  }
}

export async function listMusicRecordLikeUsers(supabase, recordId, cursor) {
  await ensureRecordExists(supabase, recordId);
  const decodedCursor = decodeCursor(cursor);
  const { data, error } = await supabase.rpc(
    "get_music_record_like_users",
    {
      p_record_id: recordId,
      p_limit: 21,
      p_cursor_nickname: decodedCursor?.nickname ?? null,
    },
  );

  if (error) throw error;

  const rows = (data ?? []).map((row) => ({
    nickname: row.nickname,
    avatarUrl: row.avatar_url ?? null,
  }));
  const pageRows = rows.slice(0, 20);
  const likeCounts = await getLikeCounts(supabase, [recordId]);

  return {
    recordId,
    likeCount: likeCounts.get(String(recordId)) ?? 0,
    users: pageRows.map(({ nickname, avatarUrl }) => ({ nickname, avatarUrl })),
    nextCursor: rows.length > 20 ? encodeCursor(pageRows.at(-1)) : null,
  };
}

export async function likeMusicRecord(supabase, currentUserId, recordId) {
  await ensureRecordExists(supabase, recordId);

  const { error } = await supabase
    .from("likes")
    .upsert(
      { user_id: currentUserId, record_id: recordId },
      {
        onConflict: "user_id,record_id",
        ignoreDuplicates: true,
      },
    );

  if (error) throw error;
  const likeCounts = await getLikeCounts(supabase, [recordId]);
  return {
    recordId,
    liked: true,
    likeCount: likeCounts.get(String(recordId)) ?? 0,
  };
}

export async function unlikeMusicRecord(supabase, currentUserId, recordId) {
  await ensureRecordExists(supabase, recordId);

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("user_id", currentUserId)
    .eq("record_id", recordId);

  if (error) throw error;
  const likeCounts = await getLikeCounts(supabase, [recordId]);
  return {
    recordId,
    liked: false,
    likeCount: likeCounts.get(String(recordId)) ?? 0,
  };
}
