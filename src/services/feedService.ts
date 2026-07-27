import type { MusicRecord } from "../types/music";

interface ApiFeedRecord {
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
  } | null;
}

export interface FollowingFeedResult {
  records: MusicRecord[];
  followingCount: number;
}

async function getErrorMessage(response: Response) {
  try {
    const body = await response.json();
    return body.error?.message || "팔로잉 피드를 불러오지 못했어요.";
  } catch {
    return "팔로잉 피드를 불러오지 못했어요.";
  }
}

function toMusicRecord(record: ApiFeedRecord): MusicRecord {
  return {
    id: record.id,
    spotifyTrackId: record.spotifyTrackId,
    songTitle: record.songTitle,
    artistName: record.artistName,
    albumName: record.albumName,
    albumImageUrl: record.albumImageUrl,
    externalUrl: record.externalUrl,
    emotion: record.emotionText,
    recordDate: record.recordDate,
    liked: record.liked,
    likeCount: record.likeCount,
    author: record.author,
  };
}

export async function getFollowingFeed(
  apiBaseUrl: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<FollowingFeedResult> {
  const response = await fetch(`${apiBaseUrl}/api/feed`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const body: {
    data?: ApiFeedRecord[];
    meta?: { followingCount?: number };
  } = await response.json();

  if (
    !Array.isArray(body.data)
    || !Number.isInteger(body.meta?.followingCount)
    || (body.meta?.followingCount ?? -1) < 0
  ) {
    throw new Error("팔로잉 피드 응답을 확인하지 못했어요.");
  }

  return {
    records: body.data.map(toMusicRecord),
    followingCount: body.meta?.followingCount ?? 0,
  };
}
