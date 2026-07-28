import { useEffect, useState } from "react";
import { getFollowingFeed } from "../services/feedService";
import type { FollowingFeedResult } from "../services/feedService";
import { MusicCard } from "./MusicCard";
import { updateMusicRecordLike } from "../services/likesService";

interface FollowingFeedProps {
  accessToken: string;
  apiBaseUrl: string;
  refreshKey: number;
  onOpenProfile?: (nickname: string) => void;
}

const emptyFeed: FollowingFeedResult = {
  records: [],
  followingCount: 0,
};

export function FollowingFeed({
  accessToken,
  apiBaseUrl,
  refreshKey,
  onOpenProfile,
}: FollowingFeedProps) {
  const [feed, setFeed] = useState(emptyFeed);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [pendingLikeId, setPendingLikeId] = useState<string | null>(null);
  const [likeErrors, setLikeErrors] = useState<Record<string, string>>({});

  async function toggleLike(id: string | number, nextLiked: boolean) {
    if (pendingLikeId !== null) return;

    const recordKey = String(id);
    setPendingLikeId(recordKey);
    setLikeErrors((current) => ({ ...current, [recordKey]: "" }));

    try {
      const nextState = await updateMusicRecordLike(
        apiBaseUrl,
        accessToken,
        id,
        nextLiked,
      );
      setFeed((current) => ({
        ...current,
        records: current.records.map((record) => (
          String(record.id) === nextState.recordId
            ? {
                ...record,
                liked: nextState.liked,
                likeCount: nextState.likeCount,
              }
            : record
        )),
      }));
    } catch (error) {
      setLikeErrors((current) => ({
        ...current,
        [recordKey]: error instanceof Error ? error.message : "좋아요 상태를 바꾸지 못했어요.",
      }));
    } finally {
      setPendingLikeId(null);
    }
  }

  function updateLikeCount(id: string | number, likeCount: number) {
    setFeed((current) => ({
      ...current,
      records: current.records.map((record) => (
        String(record.id) === String(id) ? { ...record, likeCount } : record
      )),
    }));
  }

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage("");

    getFollowingFeed(apiBaseUrl, accessToken, controller.signal)
      .then((nextFeed) => {
        if (!controller.signal.aborted) setFeed(nextFeed);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : "팔로잉 피드를 불러오지 못했어요.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, apiBaseUrl, refreshKey, retryKey]);

  return (
    <section className="feed-section" aria-labelledby="following-feed-title">
      <div className="section-heading records-heading">
        <div>
          <span>Days through music</span>
          <h2 id="following-feed-title">팔로잉의 음악 일기</h2>
        </div>
        {!isLoading && !errorMessage && <strong>{feed.records.length}</strong>}
      </div>

      {isLoading ? (
        <div className="feed-state" role="status">팔로잉의 기록을 불러오는 중...</div>
      ) : errorMessage ? (
        <div className="feed-state" role="alert">
          <strong>음악 일기를 불러오지 못했어요.</strong>
          <p>{errorMessage}</p>
          <button
            className="retry-button"
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
          >
            다시 시도
          </button>
        </div>
      ) : feed.followingCount === 0 ? (
        <div className="feed-state">
          <strong>아직 팔로우한 사람이 없어요.</strong>
          <p>아래에서 음악으로 기억하고 싶은 사람을 찾아보세요.</p>
        </div>
      ) : feed.records.length === 0 ? (
        <div className="feed-state">
          <strong>아직 도착한 음악 기록이 없어요.</strong>
          <p>팔로잉한 사람이 하루의 음악을 남기면 이곳에 보여드릴게요.</p>
        </div>
      ) : (
        <div className="feed-list">
          {feed.records.map((record) => (
            <MusicCard
              key={record.id}
              record={record}
              showLikeState
              isLikePending={pendingLikeId !== null}
              likeError={likeErrors[String(record.id)]}
              onToggleLike={toggleLike}
              apiBaseUrl={apiBaseUrl}
              accessToken={accessToken}
              onLikeCountChange={updateLikeCount}
              onOpenAuthor={onOpenProfile}
            />
          ))}
        </div>
      )}
    </section>
  );
}
