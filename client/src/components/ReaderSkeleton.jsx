const PARAGRAPH_LINE_COUNTS = [4, 4, 3]

export default function ReaderSkeleton({ article }) {
  return (
    <div className="reader-detail-content">
      <header className="app-header">
        <div className="card-source">
          {article ? (
            <>
              <span className="source-logo">{article.sourceInitial}</span>
              <span className="source-name">{article.source}</span>
            </>
          ) : (
            <>
              <span className="skeleton-block skeleton-source-logo" />
              <span className="skeleton-block skeleton-source-name" />
            </>
          )}
        </div>
        {article ? (
          <h1>{article.title}</h1>
        ) : (
          <>
            <span className="skeleton-block skeleton-title-line" />
            <span className="skeleton-block skeleton-title-line short" />
          </>
        )}
      </header>

      <main>
        <article className="article-content">
          {article
            ? article.paragraphs.map((paragraph, i) => (
                <div className="paragraph" key={i}>
                  {paragraph}
                </div>
              ))
            : PARAGRAPH_LINE_COUNTS.map((lineCount, groupIndex) => (
                <div className="paragraph" key={groupIndex}>
                  {Array.from({ length: lineCount }).map((_, lineIndex) => (
                    <span
                      key={lineIndex}
                      className={`skeleton-block skeleton-text-line${
                        lineIndex === lineCount - 1 ? " short" : ""
                      }`}
                    />
                  ))}
                </div>
              ))}
        </article>

        <div className="skeleton-block skeleton-summary-card" />
      </main>

      <div className="decision-panel">
        <p className="skeleton-block skeleton-decision-prompt" />
        <div className="decision-buttons">
          <span className="skeleton-block skeleton-decision-btn" />
          <span className="skeleton-block skeleton-decision-btn" />
          <span className="skeleton-block skeleton-decision-btn" />
        </div>
      </div>
    </div>
  )
}
