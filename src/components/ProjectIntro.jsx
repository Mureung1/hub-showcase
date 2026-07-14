import "./ProjectIntro.css";

/* 간단한 인라인 SVG 아이콘 (외부 라이브러리 없이) */
const IconBolt = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconTarget = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

// 잔소리봇 마스코트: 추후 재도입 예정 (현재 프로토타입 범위 밖)

/* ---------- 콘텐츠 데이터 ---------- */

const LANDING_HERO = {
  badge: "미루는 대학생을 위한 학업 실행 도우미",
  title: "잔소리봇",
  subLines: [
    "과제, 시험공부, 발표 준비, 조별과제까지",
    "왜 시작 못 하는지 알아채고, 지금 할 수 있는 첫 행동을 제안하는 AI",
  ],
  ctaLabel: "할 일 등록하기 →",
  // TODO: /register 라우트가 아직 없어(1주차 구현 진행 중) 실제 경로 대신 자리표시자 앵커를 씀
  ctaHref: "#register",
};

const LANDING_FEATURE_TAGS = [
  { Icon: IconBolt, label: "첫 행동(마이크로태스크) 자동 제안" },
  { Icon: IconTarget, label: "회피 원인 기반 맞춤 개입" },
];

function ProjectIntro() {
  return (
    <div className="intro-page">
      <div className="intro-wrap">
        <section className="landing-hero">
          <div className="landing-hero-text">
            <span className="landing-badge">{LANDING_HERO.badge}</span>
            <h1 className="landing-title">{LANDING_HERO.title}</h1>
            <p className="landing-sub">
              {LANDING_HERO.subLines.map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
            <a className="landing-cta" href={LANDING_HERO.ctaHref}>
              {LANDING_HERO.ctaLabel}
            </a>
          </div>
          <div className="landing-hero-visual">
            <span className="landing-hero-emoji" role="img" aria-label="잔소리봇">
              🤖
            </span>
          </div>
        </section>

        <hr className="landing-divider" />

        <div className="landing-features">
          <p className="landing-feature-label">핵심 기능</p>
          <h2 className="landing-feature-title">
            시작을 가로막는 이유부터 해결해요
          </h2>
          <div className="landing-feature-strip">
            {LANDING_FEATURE_TAGS.map(({ Icon, label }) => (
              <span className="landing-feature-tag" key={label}>
                <Icon />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectIntro;
