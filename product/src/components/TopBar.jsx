// 모든 화면이 공유하는 고정 상단바. 큰 컴포넌트에서 반복되는 부분만 뺐다.
function TopBar({ step, label, job, backTo, backLabel, go }) {
  return (
    <header className="top-bar">
      <div className="top-bar__inner">
        <button type="button" className="top-bar__brand" onClick={() => go('select')} aria-label="CareerSignal 직무 선택으로 이동">
          <span className="top-bar__mark" aria-hidden="true">
            <img src="/careersignal-mark.svg" alt="" />
          </span>
          <span className="top-bar__wordmark">
            <span className="top-bar__name">CareerSignal</span>
            <span className="top-bar__tagline">채용공고 기반 진로탐색 에이전트</span>
          </span>
        </button>
        <div className="top-bar__meta">
          {job && <span className="top-bar__job">분석 직무: <strong>{job}</strong></span>}
          <span className="top-bar__step">STEP <strong>{step}</strong> / 5 · {label}</span>
          {backTo && (
            <button className="top-bar__link" onClick={() => go(backTo)} style={{ cursor: 'pointer' }}>
              {backLabel}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
