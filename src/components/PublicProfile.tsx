import { useEffect, useState } from "react";
import {
  followUser,
  getPublicProfile,
  unfollowUser,
} from "../services/usersService";
import type { PublicProfile as PublicProfileData } from "../services/usersService";
import { PublicMusicDiary } from "./PublicMusicDiary";

interface PublicProfileProps {
  nickname: string;
  accessToken: string;
  apiBaseUrl: string;
  onBack: () => void;
  onFollowChange?: () => void;
  onLikeChange?: (id: string | number, liked: boolean, likeCount: number) => void;
  onOpenProfile?: (nickname: string) => void;
}

export function PublicProfile({
  nickname,
  accessToken,
  apiBaseUrl,
  onBack,
  onFollowChange,
  onLikeChange,
  onOpenProfile,
}: PublicProfileProps) {
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [followError, setFollowError] = useState("");

  async function toggleFollow() {
    if (!profile || profile.isMe || isFollowPending) return;

    setIsFollowPending(true);
    setFollowError("");
    try {
      const nextState = profile.isFollowing
        ? await unfollowUser(apiBaseUrl, accessToken, profile.nickname)
        : await followUser(apiBaseUrl, accessToken, profile.nickname);
      setProfile((current) => (
        current ? { ...current, isFollowing: nextState.isFollowing } : current
      ));
      onFollowChange?.();
    } catch (reason) {
      setFollowError(
        reason instanceof Error ? reason.message : "팔로우 상태를 바꾸지 못했어요.",
      );
    } finally {
      setIsFollowPending(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setProfile(null);
    setError("");
    getPublicProfile(apiBaseUrl, accessToken, nickname, controller.signal)
      .then(setProfile)
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "프로필을 불러오지 못했어요.");
        }
      });
    return () => controller.abort();
  }, [accessToken, apiBaseUrl, nickname, retryKey]);

  return (
    <section className="public-profile" aria-labelledby="public-profile-title">
      <button className="profile-back-button" type="button" onClick={onBack}>← 음악 피드로 돌아가기</button>
      {error ? (
        <div className="people-state" role="alert">
          <strong>프로필을 열지 못했어요.</strong>
          <p>{error}</p>
          <button
            className="retry-button"
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
          >
            다시 시도
          </button>
        </div>
      ) : !profile ? (
        <div className="people-state" role="status">음악 다이어리를 여는 중...</div>
      ) : (
        <>
          <div className="public-profile-header">
            {profile.avatarUrl ? (
              <img className="user-avatar" src={profile.avatarUrl} alt="" />
            ) : (
              <span className="user-avatar user-avatar-fallback" aria-hidden="true">{profile.nickname.slice(0, 1)}</span>
            )}
            <div>
              <p className="eyebrow">Music Diary</p>
              <h1 id="public-profile-title">{profile.nickname}</h1>
              <p>{profile.bio || "음악으로 하루를 기록하고 있어요."}</p>
            </div>
            {profile.isMe ? (
              <span className="follow-button is-following">내 음악 다이어리</span>
            ) : (
              <button
                className={profile.isFollowing ? "follow-button is-following" : "follow-button"}
                type="button"
                disabled={isFollowPending}
                onClick={() => void toggleFollow()}
              >
                {isFollowPending
                  ? "변경 중..."
                  : profile.isFollowing ? "언팔로우" : "팔로우"}
              </button>
            )}
          </div>
          {followError && <p className="follow-error" role="alert">{followError}</p>}
          <PublicMusicDiary
            nickname={profile.nickname}
            accessToken={accessToken}
            apiBaseUrl={apiBaseUrl}
            onLikeChange={onLikeChange}
            onOpenProfile={onOpenProfile}
          />
        </>
      )}
    </section>
  );
}
