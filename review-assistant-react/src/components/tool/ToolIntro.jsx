// 도구 화면(/app)의 "아직 분석 전" 상태에서만 보여주는 온보딩 섹션들.
// 실제 분석 로직/폼은 ReviewInputForm이 담당하고, 여기는 전부 정적인 안내용 UI다.

const TOOL_STEPS = [
  { num: 1, title: '리뷰 붙여넣기', desc: '배달앱·플레이스 리뷰를 복사해서 그대로 붙여넣으세요' },
  { num: 2, title: 'AI가 읽어드려요', desc: '감정과 자주 나온 키워드를 몇 초 만에 정리해드려요' },
  { num: 3, title: '한눈에 확인', desc: '무엇을 칭찬받고 무엇이 불만인지 바로 알 수 있어요' },
]

export function ToolHero() {
  return (
    <div className="tool-hero">
      <h1 className="tool-hero-title">
        받은 리뷰를
        <br />
        그대로 붙여넣어 보세요
      </h1>
      <p className="tool-hero-sub">복사해서 붙여넣기만 하면, AI가 감정과 키워드를 정리해 드려요</p>
    </div>
  )
}

export function ToolTips() {
  return (
    <div className="tips-box">
      <div className="tips-title">💡 이렇게 입력하면 더 정확해요</div>
      <ol className="tips-list">
        <li>리뷰 하나당 한 줄로 입력해주세요</li>
        <li>&quot;친절&quot;, &quot;대기시간&quot;처럼 구체적인 표현이 있으면 키워드를 더 잘 잡아내요</li>
        <li>최대 15개까지 한 번에 분석할 수 있어요</li>
      </ol>
    </div>
  )
}

export function ToolResultPreview() {
  return (
    <div className="tool-preview-card">
      <div className="tool-preview-title">결과 미리보기</div>
      <p className="tool-preview-sub">분석하면 이런 걸 알 수 있어요</p>
      <div className="tool-preview-bars">
        <div className="tool-preview-bar-row">
          <span className="tool-preview-bar-label">긍정</span>
          <div className="lp-bar-track">
            <div className="lp-bar-fill" style={{ width: '70%', background: 'var(--color-primary)' }} />
          </div>
        </div>
        <div className="tool-preview-bar-row">
          <span className="tool-preview-bar-label">부정</span>
          <div className="lp-bar-track">
            <div className="lp-bar-fill" style={{ width: '40%', background: 'var(--color-lp-bar-negative)' }} />
          </div>
        </div>
      </div>
      <div className="tool-preview-chips">
        <span className="tool-preview-chip">친절 ×4</span>
        <span className="tool-preview-chip">대기시간 ×5</span>
        <span className="tool-preview-chip">가격 ×3</span>
      </div>
    </div>
  )
}

export function ToolProcessSteps() {
  return (
    <div className="tool-steps">
      {TOOL_STEPS.map((step) => (
        <div className="tool-step-card" key={step.num}>
          <div className="tool-step-num">{step.num}</div>
          <div className="tool-step-title">{step.title}</div>
          <div className="tool-step-desc">{step.desc}</div>
        </div>
      ))}
    </div>
  )
}
