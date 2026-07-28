import { useEffect, useId, useRef, useState } from "react";
import {
  getMusicRecordLikeUsers,
  type PublicLikeUser,
} from "../services/likesService";

interface MusicLikeUsersProps {
  recordId: string | number;
  likeCount: number;
  apiBaseUrl: string;
  accessToken: string;
  onLikeCountChange?: (id: string | number, likeCount: number) => void;
  onOpenProfile?: (nickname: string) => void;
}

function LikeUserAvatar({ user }: { user: PublicLikeUser }) {
  if (user.avatarUrl) {
    return <img className="like-user-avatar" src={user.avatarUrl} alt="" />;
  }

  return (
    <span className="like-user-avatar like-user-avatar-fallback" aria-hidden="true">
      {user.nickname.slice(0, 1)}
    </span>
  );
}

export function MusicLikeUsers({
  recordId,
  likeCount,
  apiBaseUrl,
  accessToken,
  onLikeCountChange,
  onOpenProfile,
}: MusicLikeUsersProps) {
  const regionId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const [users, setUsers] = useState<PublicLikeUser[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadedLikeCount, setLoadedLikeCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const activeRequestRef = useRef<AbortController | null>(null);

  async function loadPage(cursor: string | undefined, append: boolean) {
    if (isLoading) return;

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const page = await getMusicRecordLikeUsers(
        apiBaseUrl,
        accessToken,
        recordId,
        cursor,
        controller.signal,
      );
      if (controller.signal.aborted) return;

      setUsers((current) => {
        const combined = append ? [...(current ?? []), ...page.users] : page.users;
        return [...new Map(combined.map((user) => [user.nickname, user])).values()];
      });
      setNextCursor(page.nextCursor);
      setLoadedLikeCount(page.likeCount);
      onLikeCountChange?.(recordId, page.likeCount);
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(
        error instanceof Error ? error.message : "함께 기억한 사람을 불러오지 못했어요.",
      );
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }

  function toggleExpanded() {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (
      nextExpanded
      && (users === null || loadedLikeCount !== likeCount)
    ) {
      void loadPage(undefined, false);
    }
  }

  useEffect(() => {
    if (
      isExpanded
      && users !== null
      && loadedLikeCount !== likeCount
    ) {
      void loadPage(undefined, false);
    }
  }, [isExpanded, likeCount, loadedLikeCount, users]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  return (
    <div className="like-users">
      <button
        className="like-count-button"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={regionId}
        onClick={toggleExpanded}
      >
        {likeCount}명이 기억했어요
      </button>

      {isExpanded && (
        <div className="like-users-panel" id={regionId}>
          {isLoading && users === null ? (
            <p role="status">함께 기억한 사람을 불러오는 중...</p>
          ) : errorMessage && users === null ? (
            <div role="alert">
              <p>{errorMessage}</p>
              <button type="button" onClick={() => void loadPage(undefined, false)}>
                다시 시도
              </button>
            </div>
          ) : users?.length === 0 ? (
            <p>아직 함께 기억한 사람을 찾지 못했어요.</p>
          ) : (
            <>
              <ul className="like-user-list">
                {users?.map((user) => (
                  <li key={user.nickname}>
                    {onOpenProfile ? (
                      <button
                        className="like-user-profile-button"
                        type="button"
                        onClick={() => onOpenProfile(user.nickname)}
                      >
                        <LikeUserAvatar user={user} />
                        <span>{user.nickname}</span>
                      </button>
                    ) : (
                      <>
                        <LikeUserAvatar user={user} />
                        <span>{user.nickname}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {errorMessage && (
                <div className="like-users-more-error" role="alert">
                  <p>{errorMessage}</p>
                  <button type="button" onClick={() => void loadPage(nextCursor ?? undefined, true)}>
                    다시 시도
                  </button>
                </div>
              )}
              {nextCursor && !errorMessage && (
                <button
                  className="like-users-more"
                  type="button"
                  disabled={isLoading}
                  onClick={() => void loadPage(nextCursor, true)}
                >
                  {isLoading ? "불러오는 중..." : "더 보기"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
