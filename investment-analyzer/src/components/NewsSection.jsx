import "./NewsSection.css";

function NewsSection({ news = [], selectedStock }) {
  const displayNews = news.slice(0, 3);

  const stockName =
    typeof selectedStock === "string"
      ? selectedStock
      : selectedStock?.name || "";

  const relatedNewsUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(
    stockName
  )}`;

  const removeHtmlTags = (text = "") => {
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  };

  return (
    <section className="card news-section">
      <div className="news-header">
        
      </div>

      {displayNews.length === 0 ? (
        <div className="news-empty">
          표시할 뉴스가 없습니다.
        </div>
      ) : (
        <div className="news-list">
          {displayNews.map((item, index) => {
            const articleUrl =
              item.originallink ||
              item.originalLink ||
              item.link ||
              item.url ||
              "#";

            const title = removeHtmlTags(
              item.title || "제목 없는 뉴스"
            );

            const description = removeHtmlTags(
              item.description || item.snippet || ""
            );

            const publishedDate =
              item.pubDate ||
              item.publishedAt ||
              item.date ||
              "";

            return (
              <article
                className="news-item"
                key={item.id || articleUrl || index}
              >
                <a
                  className="news-title"
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {title}
                </a>

              </article>
            );
          })}
        </div>
      )}

      {stockName && (
        <div className="news-footer">
          <a
            className="related-news-link"
            href={relatedNewsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            관련 뉴스 더보기
            <span aria-hidden="true"> →</span>
          </a>
        </div>
      )}
    </section>
  );
}

export default NewsSection;