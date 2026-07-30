import { Link } from 'react-router-dom';

function timeAgo(publishedAt) {
  if (!publishedAt) return '';
  const diffMs = Date.now() - new Date(publishedAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function ArticleCard({ article, isBookmarked, onToggleBookmark }) {
  return (
    <div className="group relative border border-outline-variant rounded p-stack-md bg-surface hover:border-primary transition-colors">
      <button
        type="button"
        onClick={() => onToggleBookmark(article.id)}
        aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
        className="absolute top-stack-md right-stack-md w-8 h-8 flex items-center justify-center rounded bg-btn-gray"
      >
        <span
          className="material-symbols-outlined text-[18px] text-on-surface"
          style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
        >
          bookmark
        </span>
      </button>

      <div className="flex items-center gap-stack-sm mb-stack-sm pr-8">
        <span className="font-label-mono text-label-mono uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-1 rounded">
          {article.source}
        </span>
        <span className="font-caption text-caption text-on-surface-variant">
          {timeAgo(article.publishedAt)}
        </span>
      </div>

      <Link to={`/articles/${article.id}`}>
        <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
      </Link>

      {article.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-stack-sm">
          {article.keywords.map((keyword) => (
            <span
              key={keyword}
              className="font-label-mono text-label-mono uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      <Link
        to={`/articles/${article.id}`}
        className="mt-stack-md inline-flex items-center gap-1 font-label-mono text-label-mono uppercase tracking-wide text-primary"
      >
        기사 보기
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    </div>
  );
}
