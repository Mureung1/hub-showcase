import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getArticles } from '../api/articles';
import { getBookmarks, addBookmark, removeBookmark } from '../api/bookmarks';
import ArticleCard from '../components/ArticleCard';

export default function Home() {
  const { signOut } = useAuth();
  const [articles, setArticles] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getArticles(), getBookmarks()])
      .then(([articleList, bookmarkList]) => {
        setArticles(articleList);
        setBookmarkedIds(new Set(bookmarkList.map((b) => b.article.id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const keywords = useMemo(() => {
    const set = new Set();
    articles.forEach((article) => article.keywords?.forEach((k) => set.add(k)));
    return [...set];
  }, [articles]);

  const visibleArticles = selectedKeyword
    ? articles.filter((article) => article.keywords?.includes(selectedKeyword))
    : articles;

  async function handleToggleBookmark(articleId) {
    const isBookmarked = bookmarkedIds.has(articleId);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(articleId);
      else next.add(articleId);
      return next;
    });

    try {
      if (isBookmarked) await removeBookmark(articleId);
      else await addBookmark(articleId);
    } catch (err) {
      // 실패하면 낙관적 업데이트를 되돌린다
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.add(articleId);
        else next.delete(articleId);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant px-container-padding py-stack-md flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-display-lg text-display-lg text-on-surface" style={{ fontSize: '24px', lineHeight: '32px' }}>
            Newssist
          </span>
          <span className="font-label-mono text-label-mono uppercase tracking-wide text-primary">
            AI Intelligence
          </span>
        </div>
        <button
          onClick={signOut}
          className="bg-btn-gray text-on-surface rounded-lg px-4 py-2 font-body-md text-body-md"
        >
          로그아웃
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-container-padding py-stack-lg">
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-stack-sm mb-stack-lg">
            <button
              onClick={() => setSelectedKeyword(null)}
              className={`font-label-mono text-label-mono uppercase tracking-wide px-3 py-1.5 rounded border-2 ${
                selectedKeyword === null
                  ? 'bg-btn-gray text-on-surface border-btn-gray'
                  : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              전체
            </button>
            {keywords.map((keyword) => (
              <button
                key={keyword}
                onClick={() => setSelectedKeyword(keyword)}
                className={`font-label-mono text-label-mono uppercase tracking-wide px-3 py-1.5 rounded border-2 ${
                  selectedKeyword === keyword
                    ? 'bg-btn-gray text-on-surface border-btn-gray'
                    : 'border-outline-variant text-on-surface-variant'
                }`}
              >
                {keyword}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
        )}

        {error && <p className="font-body-md text-body-md text-error">{error}</p>}

        {!loading && !error && visibleArticles.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            아직 표시할 기사가 없어요. 관심 키워드를 등록하면 기사가 채워져요.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
          {visibleArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isBookmarked={bookmarkedIds.has(article.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
