import SentimentTag from './SentimentTag.jsx'

function ExampleResultCard({ review }) {
  return (
    <div className="review-card">
      <div className="review-text">&quot;{review.text}&quot;</div>
      <div className="meta-row">
        <SentimentTag sentiment={review.sentiment} />
        {review.keywords.map((keyword) => (
          <span className="keyword-tag" key={keyword}>
            #{keyword}
          </span>
        ))}
      </div>
      <div className="solution-box">💡 개선 제안: {review.suggestion}</div>
      <div className="reply-list">
        {Object.entries(review.replies).map(([label, text]) => (
          <div className="reply-option" key={label}>
            <div className="reply-header">
              <span className="reply-label">{label}</span>
            </div>
            <div className="reply-text">{text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExampleResultCard
