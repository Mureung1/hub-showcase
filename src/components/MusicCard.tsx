import type { MusicRecord } from "../types/music";
import { formatRecordDate } from "../utils/formatRecordDate";
import { MusicLikeUsers } from "./MusicLikeUsers";

interface MusicCardProps {
  record: MusicRecord;
  showLikeState?: boolean;
  isLikePending?: boolean;
  likeError?: string;
  onToggleLike?: (id: string | number, nextLiked: boolean) => void;
  apiBaseUrl?: string;
  accessToken?: string;
  onLikeCountChange?: (id: string | number, likeCount: number) => void;
  onOpenAuthor?: (nickname: string) => void;
}

export function MusicCard({
  record,
  showLikeState = false,
  isLikePending = false,
  likeError,
  onToggleLike,
  apiBaseUrl,
  accessToken,
  onLikeCountChange,
  onOpenAuthor,
}: MusicCardProps) {
  return (
    <article className="music-card">
      <div className="card-date">
        {record.author && onOpenAuthor ? (
          <button
            className="music-card-author"
            type="button"
            onClick={() => onOpenAuthor(record.author!.nickname)}
          >
            {record.author.avatarUrl ? (
              <img src={record.author.avatarUrl} alt="" />
            ) : (
              <span className="music-card-author-fallback" aria-hidden="true">
                {record.author.nickname.slice(0, 1)}
              </span>
            )}
            <span>{record.author.nickname}</span>
          </button>
        ) : (
          <span>{record.author?.nickname ?? "Music Record"}</span>
        )}
        <time dateTime={record.recordDate}>{formatRecordDate(record.recordDate)}</time>
      </div>

      {record.albumImageUrl ? (
        <img className="album-artwork" src={record.albumImageUrl} alt={`${record.albumName ?? record.songTitle} album cover`} />
      ) : (
        <div className="album-placeholder" aria-hidden="true">
          <span>SWIM</span>
        </div>
      )}

      <div className="card-content">
        <div className="song-row">
          <div>
            <h3>{record.songTitle}</h3>
            <p>{record.artistName}</p>
            {record.albumName && <small>{record.albumName}</small>}
          </div>
          {showLikeState && onToggleLike ? (
            <button
              className={`like-button${record.liked ? " liked" : ""}`}
              type="button"
              aria-label={record.liked ? `${record.songTitle} 기억 취소` : `${record.songTitle} 기억하기`}
              aria-pressed={record.liked}
              disabled={isLikePending}
              onClick={() => onToggleLike(record.id, !record.liked)}
            >
              <span aria-hidden="true">{record.liked ? "♥" : "♡"}</span>
            </button>
          ) : showLikeState ? (
            <span
              className={`like-button${record.liked ? " liked" : ""}`}
              role="img"
              aria-label={record.liked ? `${record.songTitle} 기억한 음악` : `${record.songTitle} 기억하지 않은 음악`}
            >
              <span aria-hidden="true">{record.liked ? "♥" : "♡"}</span>
            </span>
          ) : null}
        </div>
        <blockquote>{record.emotion}</blockquote>
        {record.likeCount > 0 && apiBaseUrl && accessToken ? (
          <MusicLikeUsers
            recordId={record.id}
            likeCount={record.likeCount}
            apiBaseUrl={apiBaseUrl}
            accessToken={accessToken}
            onLikeCountChange={onLikeCountChange}
            onOpenProfile={onOpenAuthor}
          />
        ) : record.likeCount > 0 ? (
          <p className="like-count">{record.likeCount}명이 기억했어요</p>
        ) : null}
        {likeError && <p className="like-error" role="alert">{likeError}</p>}
        {record.externalUrl && (
          <a className="spotify-link" href={record.externalUrl} target="_blank" rel="noreferrer">
            Spotify에서 열기
          </a>
        )}
      </div>
    </article>
  );
}
