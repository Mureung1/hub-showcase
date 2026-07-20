function RecurringIssuePanel({ issues, onReset }) {
  return (
    <div className="recurring-panel">
      <div className="recurring-panel-header">
        <h3 className="recurring-panel-title">
          <span>⚠️</span>
          <span>반복되는 문제 감지</span>
        </h3>
        <button className="reset-history-btn" onClick={onReset}>
          누적 기록 초기화
        </button>
      </div>
      <div className="recurring-issues">
        {issues.map((issue) => (
          <div className="recurring-issue-item" key={issue.keyword}>
            <div className="issue-title">
              &quot;{issue.keyword}&quot; 관련 부정 리뷰 {issue.occurrenceCount}건 누적
            </div>
            <div className="issue-solution">💡 {issue.suggestion}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecurringIssuePanel
