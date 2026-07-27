import { useEffect, useState } from 'react';
import { getBookmarks, removeBookmark } from '../api/bookmarks';
import ArticleCard from '../components/ArticleCard';

export default function MyPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBookmarks()
      .then(setBookmarks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleBookmark(articleId) {
    setBookmarks((prev) => prev.filter((b) => b.article.id !== articleId));
    try {
      await removeBookmark(articleId);
    } catch (err) {
      getBookmarks().then(setBookmarks);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-container-padding py-stack-lg">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-stack-lg">마이페이지</h1>

      {loading && (
        <p className="font-body-md text-body-md text-on-surface-variant">불러오는 중...</p>
      )}

      {error && <p className="font-body-md text-body-md text-error">{error}</p>}

      {!loading && !error && bookmarks.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">
          아직 북마크한 기사가 없어요.
        </p>
      )}

      {bookmarks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
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
    </div>
  );
}
