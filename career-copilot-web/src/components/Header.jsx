// Header = 나 요약 + AI 관여 실측 바 + 테마 토글.
// props로 me/theme/토글함수를 "받기만" 한다(자기 상태 없음 = 표현 컴포넌트).
export default function Header({ me, theme, onToggleTheme }) {
  return (
    <header className="header">
      <div className="hgroup">
        <div className="kicker">CAREER COPILOT</div>
        <h1>
          {me.name} <span className="muted">· {me.school}</span>
        </h1>
        <p className="track">{me.track}</p>
        <p className="summary">{me.summary}</p>
      </div>

      <div className="hright">
        <button className="theme-btn" onClick={onToggleTheme} aria-label="테마 전환">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="ai-card">
          <div className="ai-label">AI 관여 실측</div>
          <div className="ai-bar">
            <span className="ai-direct" style={{ width: `${me.ai.direct}%` }}>
              직접 {me.ai.direct}%
            </span>
            <span className="ai-ai" style={{ width: `${me.ai.ai}%` }}>
              AI {me.ai.ai}%
            </span>
          </div>
          <div className="ai-basis">{me.ai.basis}</div>
        </div>
      </div>
    </header>
  )
}
