import { useEffect, useState } from "react";

function NewsSection({ selectedStock }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedStock?.name) {
      setNews([]);
      return;
    }

    const fetchNews = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/news?query=${encodeURIComponent(selectedStock.name)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "뉴스 조회에 실패했습니다.");
        }

        // 백엔드 응답 형태가 { news: [...] }인 경우
        setNews(data.news || data.items || []);
      } catch (error) {
        console.error("뉴스 조회 오류:", error);
        setError(error.message);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [selectedStock?.name]);

  return (
    <section className="card news-section">
      

      {!selectedStock?.name && (
        <div className="news-message">
          종목을 선택하면 관련 뉴스가 표시됩니다.
        </div>
      )}

      {loading && (
        <div className="news-message">
          뉴스를 불러오는 중입니다.
        </div>
      )}

      {error && (
        <div className="news-message news-error">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        selectedStock?.name &&
        news.length === 0 && (
          <div className="news-message">
            관련 뉴스가 없습니다.
          </div>
        )}

      {!loading && news.length > 0 && (
        <div className="news-list">
          {news.map((item, index) => (
            <article
              className="news-item"
              key={`${item.link || item.naverLink}-${index}`}
            >
              <div className="news-content">
                <h3>
                  <a
                    href={item.link || item.naverLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>
                </h3>

                {item.description && (
                  <p>{item.description}</p>
                )}

                {item.publishedAt && (
                  <time>
                    {formatNewsDate(item.publishedAt)}
                  </time>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatNewsDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default NewsSection;