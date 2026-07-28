export interface SwimUser {
  nickname: string;
  bio: string;
  avatarUrl: string | null;
  isFollowing: boolean;
}

export interface PublicProfile extends SwimUser {
  isMe: boolean;
}

export interface PublicDiaryPage {
  todayRecord: MusicRecord | null;
  records: MusicRecord[];
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
    throw new Error(await getErrorMessage(response, "팔로우 상태를 바꾸지 못했어요."));
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
    throw new Error(await getErrorMessage(response, "사용자 목록을 불러오지 못했어요."));
  }

  const body: { data: SwimUser[] } = await response.json();
  if (!Array.isArray(body.data)) {
    throw new Error("사용자 목록 응답을 확인하지 못했어요.");
  }

  return body.data;
}

export async function getPublicProfile(
  apiBaseUrl: string,
  accessToken: string,
  nickname: string,
  signal?: AbortSignal,
): Promise<PublicProfile> {
  const response = await fetch(
    `${apiBaseUrl}/api/users/${encodeURIComponent(nickname)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal },
  );
  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "프로필을 불러오지 못했어요."));
  }
  const body: { data?: PublicProfile } = await response.json();
  if (!body.data || typeof body.data.nickname !== "string") {
    throw new Error("프로필 응답을 확인하지 못했어요.");
  }
  return body.data;
}

interface ApiPublicMusicRecord {
  id: string | number;
  spotifyTrackId: string | null;
  songTitle: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  externalUrl: string | null;
  emotionText: string;
  recordDate: string;
  liked: boolean;
  likeCount: number;
  author: {
    nickname: string;
    avatarUrl: string | null;
  };
}

function mapPublicMusicRecord(record: ApiPublicMusicRecord): MusicRecord {
  return {
    ...record,
    emotion: record.emotionText,
  };
}

export async function getPublicMusicRecords(
  apiBaseUrl: string,
  accessToken: string,
  nickname: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<PublicDiaryPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(
    `${apiBaseUrl}/api/users/${encodeURIComponent(nickname)}/music-records${query}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "음악 다이어리를 불러오지 못했어요."),
    );
  }

  const body: {
    data?: {
      todayRecord: ApiPublicMusicRecord | null;
      records: ApiPublicMusicRecord[];
      nextCursor: string | null;
    };
  } = await response.json();
  const data = body.data;
  if (
    !data
    || (data.todayRecord !== null && typeof data.todayRecord?.songTitle !== "string")
    || !Array.isArray(data.records)
    || !data.records.every((record) => typeof record.songTitle === "string")
    || (typeof data.nextCursor !== "string" && data.nextCursor !== null)
  ) {
    throw new Error("음악 다이어리 응답을 확인하지 못했어요.");
  }

  return {
    todayRecord: data.todayRecord ? mapPublicMusicRecord(data.todayRecord) : null,
    records: data.records.map(mapPublicMusicRecord),
    nextCursor: data.nextCursor,
  };
}
import type { MusicRecord } from "../types/music";
