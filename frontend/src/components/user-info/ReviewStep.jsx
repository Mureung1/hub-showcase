function ReviewStep({ saved, summaryItems }) {
  return (
    <div className="review-panel">
      <dl className="summary-list">
        {summaryItems.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {saved && (
        <p className="success-message" role="status">
          사용자 정보가 이 브라우저에 저장되었습니다. 매물 입력으로 이동합니다.
        </p>
      )}
    </div>
  )
}

export default ReviewStep
