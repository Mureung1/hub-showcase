interface LikeState {
  recordId: string;
  liked: boolean;
  likeCount: number;
}

export interface PublicLikeUser {
  nickname: string;
  avatarUrl: string | null;
}

export interface LikeUsersPage {
  recordId: string;
  likeCount: number;
  users: PublicLikeUser[];
  nextCursor: string | null;
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const body = await response.json();
    return body.error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function updateMusicRecordLike(
  apiBaseUrl: string,
  accessToken: string,
  recordId: string | number,
  liked: boolean,
): Promise<LikeState> {
  const response = await fetch(
    `${apiBaseUrl}/api/music-records/${encodeURIComponent(String(recordId))}/likes`,
    {
      method: liked ? "POST" : "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "좋아요 상태를 바꾸지 못했어요."));
  }

  const body: { data?: LikeState } = await response.json();
  if (
    typeof body.data?.recordId !== "string"
    || typeof body.data.liked !== "boolean"
    || !Number.isInteger(body.data.likeCount)
    || body.data.likeCount < 0
  ) {
    throw new Error("좋아요 응답을 확인하지 못했어요.");
  }

  return body.data;
}

export async function getMusicRecordLikeUsers(
  apiBaseUrl: string,
  accessToken: string,
  recordId: string | number,
  cursor?: string,
  signal?: AbortSignal,
): Promise<LikeUsersPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(
    `${apiBaseUrl}/api/music-records/${encodeURIComponent(String(recordId))}/likes${query}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "함께 기억한 사람을 불러오지 못했어요."),
    );
  }

  const body: { data?: LikeUsersPage } = await response.json();
  const data = body.data;
  if (
    typeof data?.recordId !== "string"
    || !Number.isInteger(data.likeCount)
    || data.likeCount < 0
    || !Array.isArray(data.users)
    || !data.users.every((user) => (
      typeof user.nickname === "string"
      && (typeof user.avatarUrl === "string" || user.avatarUrl === null)
    ))
    || (typeof data.nextCursor !== "string" && data.nextCursor !== null)
  ) {
    throw new Error("좋아요 사용자 목록 응답을 확인하지 못했어요.");
  }

  return data;
}
