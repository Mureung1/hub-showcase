import { useEffect, useState } from 'react';
import { getReadHistory } from '../api/articles';
import { getBookmarks, addBookmark, removeBookmark } from '../api/bookmarks';
import ArticleCard from '../components/ArticleCard';

export default function MyPage() {
  const [readHistory, setReadHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getReadHistory(), getBookmarks()])
      .then(([history, bookmarkList]) => {
        setReadHistory(history);
        setBookmarks(bookmarkList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const bookmarkedIds = new Set(bookmarks.map((b) => b.article.id));

  async function handleToggleBookmark(articleId) {
    if (bookmarkedIds.has(articleId)) {
      setBookmarks((prev) => prev.filter((b) => b.article.id !== articleId));
      try {
        await removeBookmark(articleId);
      } catch (err) {
        getBookmarks().then(setBookmarks);
      }
      return;
    }

    try {
      await addBookmark(articleId);
      getBookmarks().then(setBookmarks);
    } catch (err) {
      // 추가 실패 시 낙관적 업데이트를 안 했으므로 되돌릴 것도 없음
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-container-padding py-stack-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-stack-lg">마이페이지</h1>

      {loading && (
        <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
      )}

      {error && <p className="font-body-md text-body-md text-error">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-stack-lg items-start">
          <section>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">
              읽은 기사
            </h2>
            {readHistory.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                아직 읽은 기사가 없어요.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-stack-md">
                {readHistory.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    isBookmarked={bookmarkedIds.has(article.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="lg:border-l lg:border-outline-variant lg:pl-stack-lg">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">
              북마크
            </h2>
            {bookmarks.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                아직 북마크한 기사가 없어요.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-stack-md">
                {bookmarks.map((bookmark) => (
                  <ArticleCard
                    key={bookmark.id}
                    article={bookmark.article}
                    isBookmarked
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
