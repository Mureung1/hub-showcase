// Step 0: 랜딩 히어로. 풀블리드 배경 위에 상단 네비 + 중앙 타이틀 + CTA를 얹는다.
// 배경 이미지는 사용자가 직접 그려 소유한 자작 일러스트(assets/study-hero.jpg, 원본 그림그린것.tiff).
// 상태를 갖지 않고 콜백만 받는 저결합 화면 컴포넌트.
import heroBg from "../../assets/study-hero.jpg";

const FEATURES = ["성향·상태 점검", "학습법 매칭", "오늘의 루틴", "baseline 비교"];

export function StepIntro({ hasCompleteResult, canClear, onStart, onResume, onClearData, onShowAnalysis }) {
  return (
    <section className="hero-screen" style={{ backgroundImage: `url(${heroBg})` }}>
      <div className="hero-scrim" />
      <div className="hero-focus" aria-hidden="true" />

      <div className="hero-inner">
        <header className="hero-nav">
          <div className="hero-brand">
            MBTI 공부·회복 루틴
            <span className="hero-ver">v1.0</span>
          </div>
          <nav className="hero-nav-actions">
            <button className="hero-link" onClick={onShowAnalysis} type="button">
              전체 경향(연구 집계) 보기
            </button>
          </nav>
        </header>

        <div className="hero-center">
          <p className="eyebrow hero-eyebrow">Study routine prototype</p>
          <p className="script-accent hero-script">Study &amp; Recover</p>
          <h1 className="hero-title">나에게 맞는 공부·회복 루틴을 오늘 바로 찾기</h1>
          <p className="lead hero-lead">
            성격풀이가 아니라 <strong>자기조절 회고 도구</strong>입니다. MBTI를 친숙한 입구로 삼아, 당신의 실제 공부 행동과
            피로 신호를 정리하고 → 오늘 바로 시도할 방법·루틴으로 바꾸고 → 해본 결과를 예측과 대조해 "나에게 맞는 방식"을
            스스로 검증하도록 돕습니다.
          </p>

          <div className="hero-actions">
            <button className="primary hero-cta" onClick={onStart} type="button">
              시작하기
            </button>
            {hasCompleteResult && (
              <button className="ghost hero-cta" onClick={onResume} type="button">
                이전 결과 이어보기
              </button>
            )}
          </div>

          <ul className="hero-features" aria-label="핵심 기능">
            {FEATURES.map((label) => (
              <li className="hero-chip" key={label}>{label}</li>
            ))}
          </ul>
        </div>

        <footer className="hero-foot">
          <p className="hero-note">
            MBTI는 사람을 고정적으로 판단하는 도구가 아니라 학습 선호를 탐색하는 출발점입니다. 현재 추천은 검증된 심리검사가 아닌 설명 가능한 규칙 기반 프로토타입의 시도 제안입니다.
          </p>
          {canClear && (
            <button className="hero-clear" onClick={onClearData} type="button">
              이 브라우저의 저장 데이터 삭제
            </button>
          )}
        </footer>
      </div>
    </section>
  );
}
