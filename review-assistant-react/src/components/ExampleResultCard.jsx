const EXAMPLE_REVIEW = {
  text: '음식은 맛있었는데 너무 오래 기다렸어요.',
  keywords: ['맛', '대기시간'],
  suggestion: '피크타임 인력 배치를 조정하거나, 예약/웨이팅 시스템 도입을 검토해보세요.',
  replies: {
    정중함: '소중한 의견 감사합니다. 대기 시간으로 불편을 드려 죄송합니다. 앞으로 더 신경 쓰겠습니다.',
    친근함: '앗, 많이 기다리셨죠 ㅠㅠ 더 신경쓸게요!',
    간결함: '대기시간 개선하겠습니다. 감사합니다.',
  },
}

function ExampleResultCard() {
  return (
    <div className="review-card">
      <div className="review-text">&quot;{EXAMPLE_REVIEW.text}&quot;</div>
      <div className="meta-row">
        <span className="sentiment-tag negative">부정</span>
        {EXAMPLE_REVIEW.keywords.map((keyword) => (
          <span className="keyword-tag" key={keyword}>
            #{keyword}
          </span>
        ))}
      </div>
      <div className="solution-box">💡 개선 제안: {EXAMPLE_REVIEW.suggestion}</div>
      <div className="reply-list">
        {Object.entries(EXAMPLE_REVIEW.replies).map(([label, text]) => (
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
