import './AppFrame.css'

// 2층 배경 구조 (design-system.md) — s2.html의 body(무대)/.app(앱 면) 레시피 기반.
// s2.html 원본은 앱 높이 auto(페이지 스크롤)였으나, 필터로 카드가 줄면 TabBar가
// 떠서 레이아웃이 무너지는 문제가 동작 화면에서 확인돼 --frame-h 고정 높이 +
// 콘텐츠 영역 내부 스크롤 구조로 수정 (결정 히스토리: design-system.md 5절).
function AppFrame({ children, tabBar }) {
  return (
    <div className="stage">
      <div className="app">
        <div className="app-content">{children}</div>
        {tabBar}
      </div>
    </div>
  )
}

export default AppFrame
