import { Link } from 'react-router-dom';
import { getArticleImageUrl } from '../utils/placeholderImage';

export default function HomeGridCard({ article, hero = false, isBookmarked, onToggleBookmark }) {
  return (
    <Link
      to={`/articles/${article.id}`}
      className={`group relative block rounded-xl overflow-hidden hover:z-10 hover:scale-[1.03] transition-transform duration-200 hover:shadow-[0_0_24px_rgba(15,23,42,0.2)] ${
        hero ? 'row-span-2' : ''
      }`}
    >
      <img
        src={getArticleImageUrl(article.id)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="relative h-full min-h-[160px] flex flex-col justify-between p-stack-sm">
        <div className="flex items-start justify-between">
          {article.keywords?.[0] && (
            <span className="font-label-mono text-label-mono uppercase tracking-wide bg-white/40 backdrop-blur-md border border-white/50 text-on-surface px-2 py-1 rounded-full">
              {article.keywords[0]}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleBookmark(article.id);
            }}
            aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/50"
          >
            <span
              className="material-symbols-outlined text-[18px] text-on-surface"
              style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
          </button>
        </div>

        <div className="h-[40%] -m-stack-sm mt-0 p-stack-sm pt-6 bg-gradient-to-t from-white/55 via-white/25 to-transparent backdrop-blur-sm overflow-hidden">
          <h3
            className={`font-headline-sm text-on-surface line-clamp-2 ${hero ? 'text-headline-md' : 'text-headline-sm'}`}
          >
            {article.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}
