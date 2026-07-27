export interface SwimUser {
  nickname: string;
  bio: string;
  avatarUrl: string | null;
  isFollowing: boolean;
}

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return body.error?.message || "사용자 목록을 불러오지 못했어요.";
  } catch {
    return "사용자 목록을 불러오지 못했어요.";
  }
}

interface FollowState {
  followingNickname: string;
  isFollowing: boolean;
}

async function updateFollow(
  apiBaseUrl: string,
  accessToken: string,
  followingNickname: string,
  shouldFollow: boolean,
): Promise<FollowState> {
  const response = await fetch(
    shouldFollow
      ? `${apiBaseUrl}/api/follows`
      : `${apiBaseUrl}/api/follows/${encodeURIComponent(followingNickname)}`,
    {
      method: shouldFollow ? "POST" : "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(shouldFollow ? { "Content-Type": "application/json" } : {}),
      },
      ...(shouldFollow ? { body: JSON.stringify({ followingNickname }) } : {}),
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const body: { data?: FollowState } = await response.json();
  if (
    !body.data
    || body.data.followingNickname !== followingNickname
    || body.data.isFollowing !== shouldFollow
  ) {
    throw new Error("팔로우 상태 응답을 확인하지 못했어요.");
  }

  return body.data;
}

export function followUser(apiBaseUrl: string, accessToken: string, followingNickname: string) {
  return updateFollow(apiBaseUrl, accessToken, followingNickname, true);
}

export function unfollowUser(apiBaseUrl: string, accessToken: string, followingNickname: string) {
  return updateFollow(apiBaseUrl, accessToken, followingNickname, false);
}

export async function getUsers(
  apiBaseUrl: string,
  accessToken: string,
  searchQuery = "",
  signal?: AbortSignal,
): Promise<SwimUser[]> {
  const searchParams = new URLSearchParams();
  if (searchQuery) searchParams.set("q", searchQuery);
  const queryString = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  const response = await fetch(`${apiBaseUrl}/api/users${queryString}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const body: { data: SwimUser[] } = await response.json();
  if (!Array.isArray(body.data)) {
    throw new Error("사용자 목록 응답을 확인하지 못했어요.");
  }

  return body.data;
}
