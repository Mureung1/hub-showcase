import type { MusicRecord } from "../types/music";
import { formatRecordDate } from "../utils/formatRecordDate";

interface MusicCardProps {
  record: MusicRecord;
  onToggleLike: (id: string | number) => void;
}

export function MusicCard({ record, onToggleLike }: MusicCardProps) {
  return (
    <article className="music-card">
      <div className="card-date">
        <span>{record.author?.nickname ?? "Music Record"}</span>
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
          <button
            className={`like-button${record.liked ? " liked" : ""}`}
            type="button"
            aria-label={record.liked ? `${record.songTitle} 기억 취소` : `${record.songTitle} 기억하기`}
            aria-pressed={record.liked}
            onClick={() => onToggleLike(record.id)}
          >
            <span aria-hidden="true">♡</span>
          </button>
        </div>
        <blockquote>{record.emotion}</blockquote>
        {record.externalUrl && (
          <a className="spotify-link" href={record.externalUrl} target="_blank" rel="noreferrer">
            Spotify에서 열기
          </a>
        )}
      </div>
    </article>
  );
}
