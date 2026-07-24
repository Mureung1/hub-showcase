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
