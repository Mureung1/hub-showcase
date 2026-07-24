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
