import { useEffect, useMemo, useState } from 'react';
import { getArticles } from '../api/articles';
import { getBookmarks, addBookmark, removeBookmark } from '../api/bookmarks';
import ArticleCard from '../components/ArticleCard';
import HomeGridCard from '../components/HomeGridCard';

const HERO_GRID_SIZE = 7; // 톱 이슈 1(2행 병합) + 나머지 6칸 = 4열×2행

export default function Home() {
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

  const heroArticles = visibleArticles.slice(0, HERO_GRID_SIZE);
  const restArticles = visibleArticles.slice(HERO_GRID_SIZE);

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
    <div className="relative">
      {/* 섹션 상단 국소 그라데이션 (primary → transparent, linear top→bottom) */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/15 to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-container-padding py-stack-lg">
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

        {heroArticles.length > 0 && (
          <div className="grid grid-cols-4 grid-rows-2 gap-stack-md h-[60vh] mb-stack-lg">
            {heroArticles.map((article, index) => (
              <HomeGridCard
                key={article.id}
                article={article}
                hero={index === 0}
                isBookmarked={bookmarkedIds.has(article.id)}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
          </div>
        )}

        {restArticles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
            {restArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isBookmarked={bookmarkedIds.has(article.id)}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
