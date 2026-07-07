import "./ProjectIntro.css";

/* 간단한 인라인 SVG 아이콘 (외부 라이브러리 없이) */
const IconMute = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 9v6h4l5 4V5L8 9H4z" />
    <line x1="16" y1="9" x2="21" y2="15" />
    <line x1="21" y1="9" x2="16" y2="15" />
  </svg>
);

const IconBlock = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="8" />
    <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
  </svg>
);

const IconWaitingBubble = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4 6h16v9H9l-4 4v-4H4z" />
    <circle cx="9" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

// 잔소리봇 마스코트: 추후 재도입 예정 (현재 프로토타입 범위 밖)

/* ---------- 콘텐츠 데이터 ---------- */

const PROBLEM_CARDS = [
  {
    Icon: IconMute,
    tag: "다른 이유",
    text: "막막해서, 하기 싫어서, 놀고 싶어서 미루는 이유는 매번 다릅니다.",
  },
  {
    Icon: IconBlock,
    tag: "기존 앱의 한계",
    text: "방해금지모드나 Forest는 놀고 싶은 순간을 막아줄 뿐, 정작 해야 할 일을 시작하게 만들진 못합니다.",
  },
  {
    Icon: IconWaitingBubble,
    tag: "챗봇의 한계",
    text: "챗봇은 내가 먼저 물어봐야 답합니다. 잔소리봇은 미루는 순간을 먼저 알아채고 말을 겁니다.",
  },
];

const TIMELINE_ITEMS = [
  {
    color: "#9ca0c0",
    day: "등록",
    text: "할 일 등록 시 시작 예정 시점 + 예상 회피 이유(막막함/하기싫음/놀고싶음)를 함께 선택",
  },
  {
    color: "#6b7094",
    day: "대기",
    text: "【관찰】 시작 예정 시점이 되면 시작 여부 확인 — 응답 없으면 다음 단계로",
  },
  {
    color: "#ff9770",
    day: "1차개입",
    text: "【판단】 캐릭터가 말을 걸고, 계속 미루면 점점 재촉하는 톤으로 강해집니다",
  },
  {
    color: "#ff6b4a",
    day: "맞춤처방",
    text: "【행동】 회피 이유에 맞는 첫 행동(마이크로태스크) 하나만 제안 — 반복될수록 개입 강도 상승",
  },
  {
    color: "#c1502b",
    day: "완료후",
    text: "【학습】 완료·체크인 시 기록 + 도움됐는지 피드백을 받아 다음 개입에 반영",
  },
];

const FEATURE_GROUPS = [
  {
    key: "microtask",
    className: "observe",
    label: "1. 시작 마이크로태스크 자동생성",
    items: [
      {
        tag: "적시 생성",
        text: '회피가 감지될 때마다 전체 계획이 아니라 "다음 행동 하나"만 그때그때 생성',
      },
      {
        tag: "단계적 구현",
        text: "1단계는 템플릿 매칭, 2단계는 Gemini API 기반 AI 생성으로 고도화",
      },
    ],
  },
  {
    key: "tagging",
    className: "act",
    label: "2. 회피원인 태깅 + 맞춤 개입",
    items: [
      {
        tag: "자기보고",
        text: "할 일 등록 시 예상 회피 이유 선택 + 첫 회피 발생 시 1탭으로 재확인 (할 일당 최대 2회)",
      },
      {
        tag: "맞춤 처방",
        text: "막막함/하기싫음/놀고싶음 등 회피 이유별로 다른 멘트와 해결책 제시",
      },
    ],
  },
];

function ProjectIntro() {
  return (
    <div className="intro-page">
      <div className="intro-wrap">
        <div className="intro-hero">
          <div className="intro-hero-text">
            <p className="intro-eyebrow">AI AGENT CHALLENGE · PROJECT INTRO</p>
            <h1 className="intro-title">잔소리봇</h1>
            <p className="intro-tagline">
              "미루지 마" — 이유를 알아채고, 첫 걸음을 제안하는 AI
            </p>
            <p className="intro-subtitle">
              이번에도, 마감 직전까지 미룰 건가요? 알면서도 늘 그렇게 마지막
              순간까지 버팁니다.
            </p>
            <p className="hero-hook">
              잔소리봇은 먼저 관찰하고, 먼저 말을 겁니다.
            </p>
          </div>
        </div>

        <section className="intro-section">
          <div className="section-head">
            <span className="bar" />
            <h2>어떤 문제를 해결하나요</h2>
          </div>

          <div className="card-grid">
            {PROBLEM_CARDS.map(({ Icon, tag, text }) => (
              <div className="info-card" key={tag}>
                <Icon />
                <span className="tag">{tag}</span>
                <div>{text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="intro-section">
          <div className="section-head">
            <span className="bar" />
            <h2>서비스 흐름</h2>
          </div>
          <div className="timeline-card">
            <ol className="timeline">
              {TIMELINE_ITEMS.map(({ color, day, text }) => (
                <li key={day} style={{ "--dot-color": color }}>
                  <span className="dot" />
                  <span className="day">{day}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="intro-section">
          <div className="section-head">
            <span className="bar" />
            <h2>핵심 기능</h2>
          </div>

          <div className="feature-groups">
            {FEATURE_GROUPS.map(({ key, className, label, items }) => (
              <div className={`feature-group ${className}`} key={key}>
                <div className="feature-group-label">{label}</div>
                {items.map(({ tag, text }) => (
                  <div className="info-card" key={tag}>
                    <span className="tag">{tag}</span>
                    <div>{text}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <p className="intro-footer">© AI Agent Challenge · 잔소리봇 프로젝트</p>
      </div>
    </div>
  );
}

export default ProjectIntro;
