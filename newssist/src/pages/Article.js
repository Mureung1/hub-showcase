import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticle, markArticleRead } from '../api/articles';
import { getBookmarks, addBookmark, removeBookmark } from '../api/bookmarks';

export default function Article() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([getArticle(id), getBookmarks()])
      .then(([articleData, bookmarks]) => {
        setArticle(articleData);
        setIsBookmarked(bookmarks.some((b) => b.article.id === id));
        markArticleRead(id).catch(() => {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleToggleBookmark() {
    setIsBookmarked((prev) => !prev);
    try {
      if (isBookmarked) await removeBookmark(id);
      else await addBookmark(id);
    } catch (err) {
      setIsBookmarked((prev) => !prev);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="font-body-md text-body-md text-error">{error || 'not_found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-container-padding py-stack-lg">
        <Link
          to="/"
          className="inline-flex items-center gap-1 font-label-mono text-label-mono uppercase tracking-wide text-primary mb-stack-lg"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          피드로
        </Link>

        <div className="flex items-center gap-stack-sm mb-stack-sm">
          <span className="font-label-mono text-label-mono uppercase tracking-wide bg-surface-container-low text-on-surface-variant px-2 py-1 rounded">
            {article.source}
          </span>
          <span className="font-caption text-caption text-on-surface-variant">
            {new Date(article.publishedAt).toLocaleString('ko-KR')}
          </span>
        </div>

        <div className="flex items-start justify-between gap-stack-md mb-stack-lg">
          <h1 className="font-headline-md text-headline-md text-on-surface" style={{ fontSize: '28px', lineHeight: '36px' }}>
            {article.title}
          </h1>
          <button
            type="button"
            onClick={handleToggleBookmark}
            aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded bg-btn-gray"
          >
            <span
              className="material-symbols-outlined text-[20px] text-on-surface"
              style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
          </button>
        </div>

        {article.content ? (
          <p className="font-body-lg text-body-lg text-on-surface whitespace-pre-line">
            {article.content}
          </p>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">
            본문을 불러오지 못했어요. 원문 링크를 확인해주세요.
          </p>
        )}
      </div>
    </div>
  );
}
