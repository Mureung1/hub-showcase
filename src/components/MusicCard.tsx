import type { MusicRecord } from "../types/music";

interface MusicCardProps {
  record: MusicRecord;
  onToggleLike: (id: string) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function MusicCard({ record, onToggleLike }: MusicCardProps) {
  return (
    <article className="music-card">
      <div className="card-date">
        <span>Music Record</span>
        <time dateTime={record.recordDate}>{formatDate(record.recordDate)}</time>
      </div>

      <div className="album-placeholder" aria-hidden="true">
        <span>SWIM</span>
      </div>

      <div className="card-content">
        <div className="song-row">
          <div>
            <h3>{record.songTitle}</h3>
            <p>{record.artistName}</p>
          </div>
          <button
            className={`like-button${record.liked ? " liked" : ""}`}
            type="button"
            aria-label={record.liked ? `${record.songTitle} 좋아요 취소` : `${record.songTitle} 좋아요`}
            aria-pressed={record.liked}
            onClick={() => onToggleLike(record.id)}
          >
            <span aria-hidden="true">♥</span>
          </button>
        </div>
        <blockquote>{record.emotion}</blockquote>
      </div>
    </article>
  );
}
