export class FollowTargetError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function getFollowTarget(supabase, currentUserId, followingNickname) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname")
    .ilike("nickname", escapeLikePattern(followingNickname))
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new FollowTargetError(
      "FOLLOW_TARGET_NOT_FOUND",
      "팔로우할 사용자를 찾을 수 없습니다.",
      404,
    );
  }

  if (data.id === currentUserId) {
    throw new FollowTargetError(
      "CANNOT_FOLLOW_SELF",
      "자기 자신은 팔로우할 수 없습니다.",
      400,
    );
  }

  return data;
}

export async function followUser(supabase, currentUserId, followingNickname) {
  const target = await getFollowTarget(supabase, currentUserId, followingNickname);

  const { error } = await supabase
    .from("follows")
    .upsert(
      { follower_id: currentUserId, following_id: target.id },
      {
        onConflict: "follower_id,following_id",
        ignoreDuplicates: true,
      },
    );

  if (error) throw error;
  return { followingNickname: target.nickname, isFollowing: true };
}

export async function unfollowUser(supabase, currentUserId, followingNickname) {
  const target = await getFollowTarget(supabase, currentUserId, followingNickname);

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", target.id);

  if (error) throw error;
  return { followingNickname: target.nickname, isFollowing: false };
}
