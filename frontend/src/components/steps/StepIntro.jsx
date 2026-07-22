// Step 0: 랜딩. codeit식 좌측 사이드바(서비스 overview·버그신고·데이터삭제) + 우측 콘텐츠.
// 배경 일러스트는 사용자가 직접 그려 소유한 자작 그림(assets/study-hero.jpg, 원본 그림그린것.tiff)을
// 상단 히어로 카드에 담아 유지한다. 상태를 갖지 않고 콜백만 받는 저결합 화면 컴포넌트.
import heroBg from "../../assets/study-hero.jpg";

const FLOW = [
  { n: "1", label: "성향·상태 점검" },
  { n: "2", label: "학습법 매칭" },
  { n: "3", label: "오늘의 루틴" },
  { n: "4", label: "회고 리포트" },
];

const VALUE_CARDS = [
  { ic: "🧭", label: "나에게 맞는 방식 탐색", desc: "MBTI를 입구로, 실제 공부 행동과 피로 신호를 행동지표로 정리합니다." },
  { ic: "🎯", label: "오늘 바로 할 일", desc: "추천을 20~30분 실천 카드와 회복 루틴으로 바꿔 오늘 바로 시도합니다." },
  { ic: "🔁", label: "예측·결과 대조", desc: "해본 결과를 예측과 대조해 \"나에게 맞는 방식\"을 스스로 검증합니다.", rec: true },
  { ic: "📝", label: "회고·포트폴리오화", desc: "과정을 개인 회고 리포트(로컬 전용)로 정리해 회고·포트폴리오에 씁니다.", rec: true },
];

const PRINCIPLES = [
  { ic: "🧩", tag: "성격풀이가 아니라", text: "자기조절 회고 도구입니다." },
  { ic: "🌿", tag: "진단이 아니라", text: "피로 신호와 회복 루틴만 다룹니다." },
  { ic: "🔍", tag: "단정이 아니라", text: "가능성 중심으로 제안합니다." },
];

export function StepIntro({ hasCompleteResult, canClear, onStart, onResume, onClearData, onShowAnalysis }) {
  return (
    <div className="intro-layout">
      <aside className="intro-side">
        <div className="intro-logo">
          <span className="intro-logo-mark">M</span>
          <span className="intro-logo-name">MBTI 공부·회복 루틴</span>
        </div>
        <p className="intro-side-desc">
          MBTI를 입구로 나에게 맞는 공부·회복 방식을 찾고 스스로 검증하는 자기조절 회고 도구입니다.
        </p>

        <p className="intro-nav-label">이렇게 진행돼요</p>
        <nav className="intro-nav" aria-label="진행 단계 개요">
          {FLOW.map((s) => (
            <div className="intro-nav-item" key={s.n}>
              <span className="intro-nav-num">{s.n}</span>
              {s.label}
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
          {canClear && (
            <button className="intro-side-link" onClick={onClearData} type="button">
              <span className="intro-side-dot" aria-hidden="true" />
              이 브라우저의 저장 데이터 삭제
            </button>
          )}
        </div>
      </aside>

      <main className="intro-main">
        <div className="intro-main-inner">
          <div className="intro-hero-card">
            <img src={heroBg} alt="공부·회복 루틴을 표현한 자작 일러스트" />
          </div>

          <p className="intro-eyebrow">Study &amp; recover routine</p>
          <h1 className="intro-title">
            나에게 맞는 공부·회복 루틴을<br />
            오늘 바로 <strong>찾고 검증</strong>하기
          </h1>
          <p className="intro-lead">
            성격풀이가 아니라 자기조절 회고 도구입니다. MBTI를 친숙한 입구로 삼아, 당신의 실제 공부 행동과
            피로 신호를 정리하고 → 오늘 바로 시도할 방법·루틴으로 바꾸고 → 해본 결과를 예측과 대조해 스스로 검증하도록 돕습니다.
          </p>

          <div className="intro-cta-row">
            <button className="primary" onClick={onStart} type="button">시작하기</button>
            {hasCompleteResult && (
              <button className="secondary" onClick={onResume} type="button">이전 결과 이어보기</button>
            )}
          </div>

          <h2 className="intro-section-title">이 웹앱으로 얻는 것</h2>
          <div className="intro-card-grid">
            {VALUE_CARDS.map((c) => (
              <article className="intro-card" key={c.label}>
                <div className={`intro-card-ic${c.rec ? " rec" : ""}`} aria-hidden="true">{c.ic}</div>
                <h4>{c.label}</h4>
                <p>{c.desc}</p>
              </article>
            ))}
          </div>

          <h2 className="intro-section-title">우리가 지키는 원칙</h2>
          <div className="intro-principles">
            {PRINCIPLES.map((p) => (
              <div className="intro-principle" key={p.tag}>
                <div className="intro-principle-ic" aria-hidden="true">{p.ic}</div>
                <p className="intro-principle-tag">{p.tag}</p>
                <p>{p.text}</p>
              </div>
            ))}
          </div>

          <p className="intro-note">
            MBTI는 사람을 고정적으로 판단하는 도구가 아니라 학습 선호를 탐색하는 출발점입니다. 현재 추천은
            검증된 심리검사가 아닌 설명 가능한 규칙 기반 프로토타입의 시도 제안입니다.
          </p>
        </div>
      </main>
    </div>
  );
}
