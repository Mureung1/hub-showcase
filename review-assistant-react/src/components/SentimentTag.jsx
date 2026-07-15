const SENTIMENT_LABEL = { positive: '긍정', negative: '부정', neutral: '중립' }

function SentimentTag({ sentiment, children }) {
  return (
    <span className={`sentiment-tag ${sentiment}`}>
      {SENTIMENT_LABEL[sentiment] || sentiment}
      {children != null && <> {children}</>}
    </span>
  )
}

export default SentimentTag
