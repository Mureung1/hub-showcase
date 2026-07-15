import './Topbar.css'

// Topbar = 브랜드 + 뷰 전환 탭 + (적합도 뷰일 때만) 필터·배지 + 테마토글.
// 테마 토글은 id="theme-toggle" 만 달면 index.html 스크립트가 처리(원본 v2 방식).
export default function Topbar({ view, onNav, newCount, urgentCount }) {
  const isFit = view === 'fit'
  return (
    <header className="topbar panel">
      <div className="brand">
        <div className="brand-mark">CC</div>
        <div className="brand-text">
          <h1>커리어 코파일럿</h1>
          <p>내 위키·GitHub 기반 · 매일 자동 갱신되는 채용 공고 적합도 트래커</p>
        </div>

        <nav className="nav-tabs" aria-label="화면 전환">
          <button className={`nav-tab ${isFit ? 'active' : ''}`} onClick={() => onNav('fit')}>적합도</button>
          <button className={`nav-tab ${!isFit ? 'active' : ''}`} onClick={() => onNav('intro')}>프로젝트 소개</button>
        </nav>

        {isFit && (
          <div className="filter-bar">
            <label htmlFor="role-filter">직군</label>
            <select id="role-filter" className="hdr-select" defaultValue="전체">
              <option>전체</option>
              <option>백엔드</option>
              <option>AI 백엔드</option>
              <option>AI 엔지니어</option>
            </select>
            <label htmlFor="sort-select">정렬</label>
            <select id="sort-select" className="hdr-select" defaultValue="가까운순 (갭 작은 순)">
              <option>가까운순 (갭 작은 순)</option>
              <option>적합도 높은순</option>
              <option>마감임박순</option>
              <option>신규순</option>
            </select>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {isFit && (
          <>
            <span className="updated-at">마지막 갱신 06:00</span>
            <span className="badge-pill"><span className="dot dot-new"></span>어제 대비 신규 <b>+{newCount}</b></span>
            <span className="badge-pill"><span className="dot dot-urgent"></span>마감 임박 <b>{urgentCount}</b></span>
          </>
        )}
        <button id="theme-toggle" className="theme-toggle" type="button" aria-label="라이트/다크 테마 전환" title="라이트 · 다크 전환">
          <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        </button>
      </div>
    </header>
  )
}
