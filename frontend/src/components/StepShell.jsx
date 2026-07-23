// 진행 화면(step 1~6) 공통 셸: 첫 화면과 통일한 좌측 사이드바(현재 단계 표시) + 우측 콘텐츠.
// 상단 진행바(Progress) 대신 사이드바로 진행 단계를 보여 랜딩과 시각 통일을 준다.
const NAV = [
  { step: 1, label: "MBTI" },
  { step: 2, label: "공부 설문" },
  { step: 3, label: "스트레스 설문" },
  { step: 4, label: "결과" },
  { step: 5, label: "오늘 계획" },
  { step: 6, label: "실천 카드" },
];

export function StepShell({ step, onHome, onShowAnalysis, children }) {
  return (
    <div className="intro-layout has-steps">
      <aside className="intro-side">
        <button
          className="intro-logo"
          onClick={onHome}
          type="button"
          style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
        >
          <span className="intro-logo-mark">M</span>
          <span className="intro-logo-name">MBTI 공부·회복 루틴</span>
        </button>

        <p className="intro-nav-label">진행 단계</p>
        <nav className="intro-nav" aria-label="현재 진행 단계">
          {NAV.map((n) => (
            <div
              className={`intro-nav-item${n.step === step ? " active" : ""}`}
              key={n.step}
              aria-current={n.step === step ? "step" : undefined}
            >
              <span className="intro-nav-num">{n.step}</span>{n.label}
            </div>
          ))}
        </nav>

        <div className="intro-side-foot">
          <button className="intro-side-link" onClick={onShowAnalysis} type="button">
            <span className="intro-side-dot" aria-hidden="true" />
            전체 경향(연구 집계) 보기
          </button>
          <a
            className="intro-side-link"
            href="https://github.com/bricepark94/hub/issues/new"
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="intro-side-dot" aria-hidden="true" />
            버그 신고·의견 보내기
          </a>
          <button className="intro-side-link" onClick={onHome} type="button">
            <span className="intro-side-dot" aria-hidden="true" />
            처음 화면
          </button>
        </div>
      </aside>

      <main className="intro-main">
        <div className="step-main-inner">{children}</div>
      </main>
    </div>
  );
}
