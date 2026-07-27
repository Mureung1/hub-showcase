// 결과 화면의 InsightModal과 달리 팝업이 아니라 목록 위에 항상 떠 있는 배너 — 북마크는 이미 관심 있는
// 공고만 모아둔 곳이라 "닫으면 사라지는" 팝업보다 계속 보이는 게 맞다는 판단(#25 후속). noJobs 분기는
// BookmarksPage가 별도 EmptyState로 처리하므로 여기서는 다루지 않는다.
// 문구는 결과 화면 인사이트 팝업과 겹치지 않게 "추천" 톤으로 다르게 쓰고, 링크가 있으면 배너 자체를
// 눌러서 바로 해당 보완 항목의 참고 사이트로 이동할 수 있게 한다.
function BookmarkInsightBanner({ stats, topTipLink }) {
  if (!stats || stats.total === 0) return null

  const topTip = stats.improvementRanking[0]
  const hasTip = Boolean(topTip && topTip.count > 0)
  const allMatched = stats.matched === stats.total

  const emoji = allMatched ? '🎉' : hasTip ? '😊' : '🧩'
  const message = allMatched ? (
    '북마크한 공고를 모두 지원할 수 있어요!'
  ) : hasTip ? (
    <>
      <b>{topTip.label}</b>부터 먼저 보완하는 걸 추천해요!
    </>
  ) : (
    '여러 항목을 같이 채워야 지원 가능해지는 공고들이 있어요.'
  )

  const content = (
    <>
      <span className="bookmark-insight-emoji">{emoji}</span>
      <p className="bookmark-insight-text">{message}</p>
    </>
  )

  if (hasTip && topTipLink) {
    return (
      <a
        className="bookmark-insight-banner clickable"
        href={topTipLink}
        target="_blank"
        rel="noopener noreferrer"
        title="누르면 신청 사이트로 넘어갈 수 있어요."
      >
        {content}
      </a>
    )
  }

  return <div className="bookmark-insight-banner">{content}</div>
}

export default BookmarkInsightBanner
