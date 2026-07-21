import './SortIndicator.css'

// 정렬 전환 기능 없음 — 현재 정렬 상태(마감 임박순) 표시용. mock이 이미 임박순으로 배열돼 있어 실제 정렬 로직은 불필요.
// 정렬 전환 버튼으로의 확장은 향후 과제 (design-system.md "정렬 표시" 규칙 참고).
function SortIndicator() {
  return (
    <div className="sortbar">
      <span className="sort">마감 임박순 ↓</span>
    </div>
  )
}

export default SortIndicator
