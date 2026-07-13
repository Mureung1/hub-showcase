import { useState } from "react";
import type { CSSProperties } from "react";
import { BookOpen, ListTodo, PenLine, Notebook, HelpCircle, Scale, Link2, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type MissionKey = "question" | "rebut" | "connect" | "express";

type Mission = {
  key: MissionKey;
  label: string;
  color: string;
  icon: LucideIcon;
  prompt: string;
};

const MISSIONS: Mission[] = [
  {
    key: "question",
    label: "질문",
    color: "var(--hl-question)",
    icon: HelpCircle,
    prompt: "이 글의 핵심 주장은 뭐지?",
  },
  {
    key: "rebut",
    label: "반박",
    color: "var(--hl-rebut)",
    icon: Scale,
    prompt: "이 주장에 반대한다면?",
  },
  {
    key: "connect",
    label: "연결",
    color: "var(--hl-connect)",
    icon: Link2,
    prompt: "내 상황이나 프로젝트와 연결해보면?",
  },
  {
    key: "express",
    label: "표현",
    color: "var(--hl-express)",
    icon: PenLine,
    prompt: "이 글이 놓친 관점은 뭐지?",
  },
];

type ArticleSegment = {
  text: string;
  mission?: MissionKey;
};

const ARTICLE_SEGMENTS: ArticleSegment[] = [
  { text: "틱톡과 릴스 같은 숏폼 콘텐츠는 " },
  { text: "15초 안에 결론부터 보여주도록 설계되어 있다.", mission: "question" },
  { text: " 덕분에 우리는 어떤 정보든 빠르게 훑을 수 있게 됐지만, " },
  { text: "끝까지 읽지 않아도 다 안 것 같은 착각", mission: "rebut" },
  { text: "도 함께 커진다. 이런 소비 방식은 " },
  { text: "읽은 직후 내 언어로 다시 정리하는 습관", mission: "connect" },
  { text: "이 있을 때만 실제 이해로 이어진다. 결국 문제는 콘텐츠의 길이가 아니라 " },
  { text: "내가 그 콘텐츠에 무엇을 더했는지", mission: "express" },
  { text: "다." },
];

const INSIGHTS = [
  {
    title: "태도의 문제",
    desc: "AI를 쓰는 것 자체보다 과의존하는 태도가 비판적 사고를 낮춘다. 자신의 판단에 자신감이 있는 사람일수록 AI 결과를 더 비판적으로 검토한다.",
  },
  {
    title: "공부로 만들면 안 온다",
    desc: "사고력 훈련을 거창한 학습으로 만들면 바쁜 대학생은 오지 않는다. 짧고 반복되는 마이크로 루틴이 현실적인 습관이 된다.",
  },
  {
    title: "관심사 위에서 작동해야 한다",
    desc: "관심 있는 주제를 읽을 때는 '내 상황에 맞나?', '진짜인가?' 같은 질문이 자연스럽게 떠오른다.",
  },
  {
    title: "남겨야 진짜 훈련이다",
    desc: "AI 시대에 필요한 사고력은 정보를 검증하고 통합하는 감독 능력이다. 읽은 뒤 한 번 남기는 루틴이 이 능력을 훈련시킨다.",
  },
];

const LOOP_STEPS = [
  { icon: BookOpen, title: "오늘의 글", desc: "관심사 맞춤 글 1~3개" },
  { icon: ListTodo, title: "오늘의 미션", desc: "질문·반박·연결·표현 중 하나" },
  { icon: PenLine, title: "한 줄 사고 기록", desc: "짧은 문장으로 남기기" },
  { icon: Notebook, title: "사고 log", desc: "쌓인 생각을 다시 보기" },
];

type LogEntry = {
  date: string;
  source: string;
  mission: MissionKey;
  note: string;
};

const LOG_ENTRIES: LogEntry[] = [
  {
    date: "07.04",
    source: "AI 요약이 놓치는 것들",
    mission: "rebut",
    note: "요약은 결론만 남기고 저자가 왜 그렇게 판단했는지는 지운다.",
  },
  {
    date: "07.05",
    source: "제주 청년 창업 생태계 리포트",
    mission: "connect",
    note: "우리 팀 아이디어도 결국 로컬 데이터 접근성 문제로 귀결된다.",
  },
  {
    date: "07.06",
    source: "숏폼 콘텐츠와 집중력",
    mission: "question",
    note: "핵심 주장은 '길이'가 아니라 '내가 더한 것'이 이해를 만든다는 것.",
  },
];

function missionOf(key: MissionKey): Mission {
  const mission = MISSIONS.find((m) => m.key === key);
  if (!mission) {
    throw new Error(`정의되지 않은 미션 key입니다: ${key}`);
  }
  return mission;
}

export default function ServiceIntro() {
  const [activeMission, setActiveMission] = useState<MissionKey>("question");
  const active = missionOf(activeMission);

  return (
    <div className="tlx-root">
      <style>{`
        .tlx-root {
          --paper: #F2F3EE;
          --paper-raised: #FFFFFF;
          --ink: #20242C;
          --ink-soft: #5B606A;
          --rule: #DBDCD4;
          --hl-question: #F5DD5A;
          --hl-rebut: #FF95A8;
          --hl-connect: #86D6BE;
          --hl-express: #A6B4F5;

          background: var(--paper);
          color: var(--ink);
          font-family: -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
          padding: 56px 24px 72px;
          line-height: 1.6;
        }

        .tlx-root * { box-sizing: border-box; }

        .tlx-wrap { max-width: 1040px; margin: 0 auto; }

        .tlx-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-soft);
          margin-bottom: 18px;
        }
        .tlx-eyebrow::before {
          content: "";
          width: 18px;
          height: 2px;
          background: var(--ink);
        }

        .tlx-intro-line {
          font-size: 18px;
          font-weight: 600;
          max-width: 56ch;
          margin: 0 auto 28px;
          color: var(--ink);
          text-align: center;
        }

        /* 배너 자리 */
        .tlx-banner {
          width: 100%;
          aspect-ratio: 21 / 7;
          overflow: hidden;
          border: 1px dashed var(--rule);
          border-radius: 14px;
          background: var(--paper-raised);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--ink-soft);
          margin-bottom: 44px;
        }
        .tlx-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .tlx-banner svg { width: 22px; height: 22px; }
        .tlx-banner span { font-size: 13px; }

        .tlx-hero {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 48px;
          align-items: start;
          padding-bottom: 56px;
          border-bottom: 1px solid var(--rule);
        }
        @media (max-width: 860px) {
          .tlx-hero { grid-template-columns: 1fr; }
        }

        .tlx-hero-left {
          border-left: 3px solid var(--ink);
          padding-left: 20px;
        }

        .tlx-hero-kicker {
          display: block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--ink-soft);
          margin-bottom: 14px;
        }

        .tlx-hero-right {
          border-left: 1px solid var(--rule);
          padding-left: 24px;
        }
        @media (max-width: 860px) {
          .tlx-hero-right { border-left: none; padding-left: 0; }
        }

        .tlx-h1 {
          font-size: clamp(32px, 4.4vw, 48px);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
          color: var(--ink);
        }
        .tlx-h1 em {
          font-style: normal;
          background-image: linear-gradient(transparent 62%, var(--hl-question) 62%);
        }

        .tlx-lede {
          font-size: 17px;
          color: var(--ink-soft);
          max-width: 46ch;
          margin: 0;
        }

        /* 주석 카드 (시그니처 요소) */
        .tlx-card {
          background: var(--paper-raised);
          border: 1px solid var(--rule);
          border-radius: 14px;
          padding: 22px 24px;
          box-shadow: 0 1px 0 rgba(0,0,0,0.03);
        }
        .tlx-card-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          letter-spacing: 0.04em;
          margin-bottom: 12px;
        }
        .tlx-article {
          font-size: 15.5px;
          color: var(--ink);
        }
        .tlx-mark {
          position: relative;
          cursor: pointer;
          padding: 0.02em 0.1em;
          border-radius: 2px;
          background-color: color-mix(in srgb, var(--mark-color) 55%, transparent);
          mix-blend-mode: multiply;
          transition: background-color 0.15s ease;
        }
        .tlx-mark:hover,
        .tlx-mark:focus-visible,
        .tlx-mark.is-active {
          background-color: var(--mark-color);
        }

        .tlx-note {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px dashed var(--rule);
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .tlx-note-icon {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--note-color);
        }
        .tlx-note-icon svg { width: 14px; height: 14px; color: var(--ink); }
        .tlx-note-body { font-size: 13.5px; color: var(--ink); }
        .tlx-note-tag {
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.03em;
          color: var(--ink-soft);
          display: block;
          margin-bottom: 2px;
        }

        /* 공용 섹션 */
        .tlx-section { padding: 56px 0; border-bottom: 1px solid var(--rule); }
        .tlx-section-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.01em;
          margin: 0 0 8px;
          color: var(--ink);
        }
        .tlx-section-sub {
          font-size: 14.5px;
          color: var(--ink-soft);
          margin: 0 0 32px;
        }

        /* 인사이트 / 루프 카드 (공용) */
        .tlx-card-grid {
          display: flex;
          align-items: stretch;
          gap: 12px;
          flex-wrap: wrap;
        }
        .tlx-loop-step {
          flex: 1 1 200px;
          background: var(--paper-raised);
          border: 1px solid var(--rule);
          border-radius: 12px;
          padding: 18px;
        }
        .tlx-loop-num {
          font-size: 12px;
          font-weight: 700;
          color: var(--ink-soft);
          margin-bottom: 10px;
        }
        .tlx-loop-icon { width: 20px; height: 20px; margin-bottom: 10px; }
        .tlx-loop-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: var(--ink); }
        .tlx-loop-desc { font-size: 13px; color: var(--ink-soft); }
        .tlx-loop-arrow {
          display: flex;
          align-items: center;
          color: var(--ink-soft);
          flex: 0 0 auto;
        }
        @media (max-width: 760px) {
          .tlx-loop-arrow { display: none; }
          .tlx-loop-step { flex: 1 1 100%; }
        }
        .tlx-loop-cycle {
          margin-top: 14px;
          font-size: 13px;
          color: var(--ink-soft);
        }

        /* 미션 타입 */
        .tlx-missions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 760px) {
          .tlx-missions { grid-template-columns: repeat(2, 1fr); }
        }
        .tlx-mission-btn {
          text-align: left;
          border: 1px solid var(--rule);
          background: var(--paper-raised);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          font: inherit;
          color: inherit;
        }
        .tlx-mission-btn.is-active {
          border-color: var(--ink);
        }
        .tlx-mission-dot {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
        }
        .tlx-mission-dot svg { width: 13px; height: 13px; color: var(--ink); }
        .tlx-mission-label { font-weight: 700; font-size: 14px; margin-bottom: 4px; color: var(--ink); }
        .tlx-mission-prompt { font-size: 12.5px; color: var(--ink-soft); }

        /* 사고 log — 카드뉴스 스타일 */
        .tlx-log-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 860px) {
          .tlx-log-cards { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 620px) {
          .tlx-log-cards { grid-template-columns: 1fr; }
        }
        .tlx-log-card {
          background: var(--paper-raised);
          border: 1px solid var(--rule);
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          aspect-ratio: 4 / 5;
        }
        .tlx-log-card-top {
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tlx-log-card-mission {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--ink);
        }
        .tlx-log-card-mission svg { width: 14px; height: 14px; }
        .tlx-log-card-date { font-size: 12px; color: var(--ink); opacity: 0.7; }
        .tlx-log-card-body {
          flex: 1;
          padding: 20px 18px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .tlx-log-card-note {
          font-size: 17px;
          font-weight: 700;
          line-height: 1.45;
          color: var(--ink);
          margin: 0;
        }
        .tlx-log-card-source {
          font-size: 12.5px;
          color: var(--ink-soft);
          margin-top: 16px;
        }
      `}</style>

      <div className="tlx-wrap">

        <p className="tlx-intro-line">
          관심 있는 글을 읽는 짧은 순간에 질문·반박·연결·표현을 더해, <br></br>
          AI 시대에 잃기 쉬운 비판적 사고 습관을 되찾는 서비스
        </p>

        {/* 사고력 이미지 배너 자리 — 실제 이미지로 교체하세요 */}
        <div className="tlx-banner">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSw_kNP616kRUJncqVe3ueqoskG46xPj61Q9N_hbM8rnA&s=10"
            alt="생각하는 아이"
          />
        </div>

        <section className="tlx-hero">
          <div className="tlx-hero-left">
            <span className="tlx-hero-kicker">문제 제기</span>
            <h1 className="tlx-h1">
              정보는 늘었지만, <br></br><em>생각하는 힘은 줄어든다</em>
            </h1>
            <p className="tlx-lede">
              카네기멜론대·MS의 실사용 연구에서는 응답자의 72%가 AI 사용 시 인지적 노력이 줄었다고
              답했고, AI 능력에 대한 신뢰가 높을수록 비판적 사고는 더 크게 감소했다. 읽기·질문하기·
              반박하기·자기 의견 형성 같은 사고의 핵심 과정이 점점 생략되고 있는 것이다.
            </p>
          </div>

          <div className="tlx-hero-right">
            <div className="tlx-card">
              <div className="tlx-card-label">서비스 미리보기 · 오늘의 글 — 하이라이트에 마우스를 올려보세요</div>
              <p className="tlx-article">
                {ARTICLE_SEGMENTS.map(({ text, mission }, i) =>
                  mission ? (
                    <span
                      key={i}
                      tabIndex={0}
                      role="button"
                      className={`tlx-mark${activeMission === mission ? " is-active" : ""}`}
                      style={{ "--mark-color": missionOf(mission).color } as CSSProperties}
                      onMouseEnter={() => setActiveMission(mission)}
                      onFocus={() => setActiveMission(mission)}
                      onClick={() => setActiveMission(mission)}
                    >
                      {text}
                    </span>
                  ) : (
                    <span key={i}>{text}</span>
                  )
                )}
              </p>
              <div className="tlx-note">
                <div className="tlx-note-icon" style={{ "--note-color": active.color } as CSSProperties}>
                  <active.icon />
                </div>
                <div className="tlx-note-body">
                  <span className="tlx-note-tag">오늘의 미션 · {active.label}</span>
                  {active.prompt}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tlx-section">
          <h2 className="tlx-section-title">이렇게 설계한 이유</h2>
          <p className="tlx-section-sub">문제 정의를 서비스 관점에서 재해석한 네 가지 인사이트.</p>
          <div className="tlx-card-grid">
            {INSIGHTS.map((insight, i) => (
              <div className="tlx-loop-step" key={insight.title}>
                <div className="tlx-loop-num">INSIGHT {i + 1}</div>
                <div className="tlx-loop-title">{insight.title}</div>
                <div className="tlx-loop-desc">{insight.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="tlx-section">
          <h2 className="tlx-section-title">매일 반복되는 루프</h2>
          <p className="tlx-section-sub">읽기에서 끝나지 않고, 기록으로 이어지고, 다시 다음 글로 연결된다.</p>
          <div className="tlx-card-grid">
            {LOOP_STEPS.map((step, i) => (
              <>
                <div className="tlx-loop-step" key={step.title}>
                  <div className="tlx-loop-num">STEP {i + 1}</div>
                  <step.icon className="tlx-loop-icon" />
                  <div className="tlx-loop-title">{step.title}</div>
                  <div className="tlx-loop-desc">{step.desc}</div>
                </div>
                {i < LOOP_STEPS.length - 1 && (
                  <div className="tlx-loop-arrow" key={`arrow-${i}`}>
                    <ArrowRight size={18} />
                  </div>
                )}
              </>
            ))}
          </div>
        </section>

        <section className="tlx-section">
          <h2 className="tlx-section-title">네 가지 사고 행동</h2>
          <p className="tlx-section-sub">매일 하나만 골라 짧게 남기면 된다.</p>
          <div className="tlx-missions">
            {MISSIONS.map((m) => (
              <button
                key={m.key}
                className={`tlx-mission-btn${activeMission === m.key ? " is-active" : ""}`}
                onClick={() => setActiveMission(m.key)}
              >
                <div className="tlx-mission-dot" style={{ background: m.color }}>
                  <m.icon />
                </div>
                <div className="tlx-mission-label">{m.label}</div>
                <div className="tlx-mission-prompt">{m.prompt}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="tlx-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <h2 className="tlx-section-title">사고 log</h2>
          <p className="tlx-section-sub">내가 어떤 글에, 어떤 생각을 더했는지 카드로 쌓여서 남는다.</p>
        </section>
      </div>
    </div>
  );
}