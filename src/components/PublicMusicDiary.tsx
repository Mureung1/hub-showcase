import { useEffect, useState } from "react";
import { getPublicMusicRecords } from "../services/usersService";
import { updateMusicRecordLike } from "../services/likesService";
import type { MusicRecord } from "../types/music";
import { MusicCard } from "./MusicCard";

interface PublicMusicDiaryProps {
  nickname: string;
  accessToken: string;
  apiBaseUrl: string;
  onLikeChange?: (id: string | number, liked: boolean, likeCount: number) => void;
  onOpenProfile?: (nickname: string) => void;
}

function mergeRecords(current: MusicRecord[], incoming: MusicRecord[]) {
  const recordsById = new Map(current.map((record) => [String(record.id), record]));
  incoming.forEach((record) => recordsById.set(String(record.id), record));
  return [...recordsById.values()];
}

export function PublicMusicDiary({
  nickname,
  accessToken,
  apiBaseUrl,
  onLikeChange,
  onOpenProfile,
}: PublicMusicDiaryProps) {
  const [todayRecord, setTodayRecord] = useState<MusicRecord | null>(null);
  const [records, setRecords] = useState<MusicRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [pendingLikeId, setPendingLikeId] = useState<string | null>(null);
  const [likeErrors, setLikeErrors] = useState<Record<string, string>>({});

  function updateRecordState(
    id: string | number,
    update: (record: MusicRecord) => MusicRecord,
  ) {
    setTodayRecord((current) => (
      current && String(current.id) === String(id) ? update(current) : current
    ));
    setRecords((current) => current.map((record) => (
      String(record.id) === String(id) ? update(record) : record
    )));
  }

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
      updateRecordState(id, (record) => ({
        ...record,
        liked: nextState.liked,
        likeCount: nextState.likeCount,
      }));
      onLikeChange?.(id, nextState.liked, nextState.likeCount);
    } catch (reason) {
      setLikeErrors((current) => ({
        ...current,
        [recordKey]: reason instanceof Error
          ? reason.message
          : "좋아요 상태를 바꾸지 못했어요.",
      }));
    } finally {
      setPendingLikeId(null);
    }
  }

  function updateLikeCount(id: string | number, likeCount: number) {
    updateRecordState(id, (record) => ({ ...record, likeCount }));
  }

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    getPublicMusicRecords(apiBaseUrl, accessToken, nickname, undefined, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setTodayRecord(page.todayRecord);
        setRecords(page.records);
        setNextCursor(page.nextCursor);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error ? reason.message : "음악 다이어리를 불러오지 못했어요.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, apiBaseUrl, nickname, retryKey]);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadMoreError("");
    try {
      const page = await getPublicMusicRecords(
        apiBaseUrl,
        accessToken,
        nickname,
        nextCursor,
      );
      setRecords((current) => mergeRecords(current, page.records));
      setNextCursor(page.nextCursor);
    } catch (reason) {
      setLoadMoreError(
        reason instanceof Error ? reason.message : "지난 기록을 더 불러오지 못했어요.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (isLoading) {
    return <div className="people-state" role="status">음악 다이어리를 펼치는 중...</div>;
  }

  if (error) {
    return (
      <div className="people-state" role="alert">
        <strong>음악 다이어리를 열지 못했어요.</strong>
        <p>{error}</p>
        <button
          className="retry-button"
          type="button"
          onClick={() => setRetryKey((current) => current + 1)}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!todayRecord && records.length === 0) {
    return (
      <div className="people-state">
        <strong>아직 남겨진 음악 기록이 없어요.</strong>
        <p>{nickname}님의 첫 음악과 기억을 기다리고 있어요.</p>
      </div>
    );
  }

  return (
    <div className="public-diary">
      {todayRecord && (
        <section className="public-diary-today" aria-labelledby="public-today-title">
          <div className="section-heading">
            <span>Today&apos;s Record</span>
            <h2 id="public-today-title">오늘의 음악</h2>
          </div>
          <MusicCard
            record={todayRecord}
            showLikeState
            apiBaseUrl={apiBaseUrl}
            accessToken={accessToken}
            isLikePending={pendingLikeId !== null}
            likeError={likeErrors[String(todayRecord.id)]}
            onToggleLike={toggleLike}
            onLikeCountChange={updateLikeCount}
            onOpenAuthor={onOpenProfile}
          />
        </section>
      )}

      {records.length > 0 && (
        <section className="public-diary-past" aria-labelledby="public-diary-title">
          <div className="section-heading records-heading">
            <div>
              <span>Music Diary</span>
              <h2 id="public-diary-title">지난 음악 기록</h2>
            </div>
          </div>
          <div className="public-diary-list">
            {records.map((record) => (
              <MusicCard
                key={record.id}
                record={record}
                showLikeState
                apiBaseUrl={apiBaseUrl}
                accessToken={accessToken}
                isLikePending={pendingLikeId !== null}
                likeError={likeErrors[String(record.id)]}
                onToggleLike={toggleLike}
                onLikeCountChange={updateLikeCount}
                onOpenAuthor={onOpenProfile}
              />
            ))}
          </div>
        </section>
      )}

      {loadMoreError && <p className="like-error" role="alert">{loadMoreError}</p>}
      {nextCursor && (
        <button
          className="retry-button public-diary-more"
          type="button"
          disabled={isLoadingMore}
          onClick={() => void loadMore()}
        >
          {isLoadingMore ? "지난 기록을 불러오는 중..." : "지난 기록 더 보기"}
        </button>
      )}
    </div>
  );
}
