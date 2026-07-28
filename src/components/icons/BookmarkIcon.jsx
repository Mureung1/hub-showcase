// JobCard/JobDetailModal의 북마크 토글이 공유하는 아이콘 — 별(★/☆) 대신 원 안에 체크 표시로.
// 파비콘(체크 배지)과 같은 시각 언어라 브랜드 일관성도 있고, 공고 항목별 충족 여부에 쓰는
// 플레인 ✓/✕ 글자와도 헷갈리지 않는다(원으로 감싸져 있어 구분됨).
// 색상은 부모(.bookmark-toggle-btn)의 CSS color를 currentColor로 그대로 물려받는다.
function BookmarkIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12.3l2.5 2.5L16 9.3"
        fill="none"
        stroke={filled ? '#fff' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default BookmarkIcon
