import { Link } from "react-router-dom";
import nagbotLanding from "../assets/characters/nagbot_landing.png";
import nagbotLv1 from "../assets/characters/nagbot_lv1.png";
import nagbotLv2 from "../assets/characters/nagbot_lv2.png";
import nagbotLv3 from "../assets/characters/nagbot_lv3.png";
import nagbotLv4 from "../assets/characters/nagbot_lv4.png";
import journeyLv0Clear from "../assets/backgrounds/journey_lv0_clear.png";
import journeyLv1PartlyCloudy from "../assets/backgrounds/journey_lv1_partly_cloudy.png";
import journeyLv2Cloudy from "../assets/backgrounds/journey_lv2_cloudy.png";
import journeyLv3Rain from "../assets/backgrounds/journey_lv3_rain.png";
import journeyLv4Storm from "../assets/backgrounds/journey_lv4_storm.png";
import "./ProjectIntro.css";

const PROBLEM_ITEMS = [
  {
    title: "할 일이 너무 크게 느껴질 때",
    body: "무엇부터 해야 할지 막막하면 시작점 자체를 고르기 어려워져요.",
  },
  {
    title: "완벽하게 해야 한다는 부담이 들 때",
    body: "처음부터 잘해야 한다는 압박이 오히려 첫 움직임을 늦추기도 해요.",
  },
  {
    title: "눈앞의 다른 유혹이 더 쉬울 때",
    body: "하기 싫은 마음이 올라오면 쉬운 선택으로 미루기 쉬워져요.",
  },
];

const FLOW_STEPS = [
  {
    eyebrow: "할 일 등록",
    title: "해야 할 일과 필요한 정보를 입력해요",
    body: "제목, 유형, 시작 시각과 마감을 적어두면 준비가 끝나요.",
  },
  {
    eyebrow: "미루는 이유 확인",
    title: "잔소리봇이 막히는 이유를 물어봐요",
    body: "시작이 어려워지면 알림으로 먼저 다가와 지금 막히는 이유를 물어봐요.",
  },
  {
    eyebrow: "첫 행동 제안",
    title: "지금 바로 할 수 있는 행동을 제안해요",
    body: "선택한 이유에 맞춰 가장 작은 첫 행동 하나로 좁혀서 보여줘요.",
  },
  {
    eyebrow: "함께 집중",
    title: "Focus Mode로 시작을 이어가요",
    body: "제안받은 행동으로 바로 집중 시간을 시작해요.",
  },
  {
    eyebrow: "완료와 기록",
    title: "완료하고 History에서 돌아봐요",
    body: "할 일을 완료하고 지나온 기록을 History에서 확인해요.",
  },
];

const JOURNEY_WEATHER_STEPS = [
  { level: "Lv0", label: "맑음", image: journeyLv0Clear },
  { level: "Lv1", label: "구름 조금", image: journeyLv1PartlyCloudy },
  { level: "Lv2", label: "흐림", image: journeyLv2Cloudy },
  { level: "Lv3", label: "비", image: journeyLv3Rain },
  { level: "Lv4", label: "폭풍", image: journeyLv4Storm },
];

const LEVEL_STEPS = [
  {
    level: "Lv1",
    title: "부드럽게 시작을 권해요",
    body: "가볍게 말을 걸며 지금 시작해 볼 수 있는 흐름을 엽니다.",
    image: nagbotLv1,
  },
  {
    level: "Lv2",
    title: "행동을 더 작게 줄여줘요",
    body: "바로 실행할 수 있도록 첫 행동을 더 구체적으로 좁혀 제안합니다.",
    image: nagbotLv2,
  },
  {
    level: "Lv3",
    title: "미루는 이유를 다시 확인해요",
    body: "현재 막히는 이유를 다시 묻고, 그 이유에 맞게 개입 방식을 조정합니다.",
    image: nagbotLv3,
  },
  {
    level: "Lv4",
    title: "지금 바로 시작하도록 강하게 붙잡아요",
    body: "마감 압박이 커질수록 더 분명한 톤으로 시작 버튼을 밀어줍니다.",
    image: nagbotLv4,
  },
];

function ProjectIntro() {
  return (
    <div className="intro-page">
      <div className="intro-wrap">
        <header className="landing-topbar">
          <Link className="landing-brand" to="/landing">
            <img className="landing-brand-character" src={nagbotLanding} alt="" aria-hidden="true" />
            <span className="landing-brand-name">잔소리봇</span>
          </Link>

          <nav className="landing-nav" aria-label="랜딩 섹션">
            <a className="landing-nav-link" href="#landing-about">
              서비스 소개
            </a>
            <a className="landing-nav-link" href="#landing-flow">
              사용 흐름
            </a>
            <Link className="landing-nav-cta" to="/register">
              시작하기
            </Link>
          </nav>
        </header>

        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">잔소리봇 · 대학생 학업 실행 도우미</p>
            <h1 className="landing-title" id="landing-hero-title">
              미루는 이유를 찾고,
              <br />
              지금 시작할 첫 행동을 제안해요.
            </h1>
            <p className="landing-subtitle">
              해야 할 일이 막막할 때, 잔소리봇이 미루는 이유를 확인하고{" "}
              <br className="landing-subtitle-break" />
              지금 바로 할 수 있는 작은 행동을 제안해요.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-cta" to="/register">
                첫 행동 시작하기
              </Link>
              <a className="landing-secondary-link" href="#landing-flow">
                실제 흐름 보기
              </a>
            </div>
          </div>

          <div className="landing-hero-stage">
            <img
              className="landing-journey-background"
              src={journeyLv0Clear}
              alt=""
              aria-hidden="true"
            />
            <div className="landing-hero-panel">
              <p className="landing-panel-label">오늘의 시작</p>
              <strong>왜 막히는지 먼저 확인하고, 바로 할 수 있는 첫 행동 하나로 줄여요.</strong>
            </div>
            <div className="landing-hero-character-shadow" aria-hidden="true" />
            <img
              className="landing-hero-character"
              src={nagbotLanding}
              alt=""
              aria-hidden="true"
              draggable="false"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          </div>
        </section>

        <section className="landing-section landing-problems" id="landing-about" aria-labelledby="landing-problem-title">
          <div className="landing-section-heading">
            <p className="landing-section-eyebrow">왜 시작이 어려울까요?</p>
            <h2 className="landing-section-title" id="landing-problem-title">
              계획보다 먼저, 막히는 이유를 다룹니다
            </h2>
          </div>

          <div className="landing-problem-grid">
            {PROBLEM_ITEMS.map((item) => (
              <article className="landing-problem-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-flow" id="landing-flow" aria-labelledby="landing-flow-title">
          <div className="landing-section-heading">
            <p className="landing-section-eyebrow">사용 흐름</p>
            <h2 className="landing-section-title" id="landing-flow-title">
              등록부터 완료까지, 이렇게 사용해요
            </h2>
          </div>

          <ol className="landing-flow-list">
            {FLOW_STEPS.map((step, index) => (
              <li className="landing-flow-step" key={step.title}>
                <div className="landing-step-index" aria-hidden="true">
                  {index + 1}
                </div>
                <div className="landing-step-copy">
                  <p className="landing-step-eyebrow">{step.eyebrow}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section landing-levels" aria-labelledby="landing-level-title">
          <div className="landing-section-heading">
            <p className="landing-section-eyebrow">레벨별 개입</p>
            <h2 className="landing-section-title" id="landing-level-title">
              미루는 정도에 따라 개입이 달라져요
            </h2>
          </div>

          <div className="landing-level-track">
            {LEVEL_STEPS.map((step) => (
              <article className="landing-level-step" key={step.level}>
                <img className="landing-level-character" src={step.image} alt="" aria-hidden="true" />
                <div className="landing-level-copy">
                  <p className="landing-level-badge">{step.level}</p>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-journey" aria-labelledby="landing-journey-title">
          <div className="landing-journey-copy">
            <p className="landing-section-eyebrow">Shared Journey</p>
            <h2 className="landing-section-title" id="landing-journey-title">
              집중하는 시간을, 함께 걷는 여정으로 보여줘요
            </h2>
            <p className="landing-journey-text">
              Focus Mode를 시작하면 잔소리봇이 함께 걸어갑니다. 미루는 시간이 길어질수록 여정의
              분위기와 개입 단계도 달라져요.
            </p>
          </div>
          <div className="landing-journey-thumbs">
            {JOURNEY_WEATHER_STEPS.map((step) => (
              <figure className="landing-journey-thumb" key={step.level}>
                <img src={step.image} alt="" aria-hidden="true" />
                <figcaption>
                  <span className="landing-journey-thumb-level">{step.level}</span>
                  {step.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="landing-final-title">
          <p className="landing-section-eyebrow">지금 시작하기</p>
          <h2 className="landing-section-title" id="landing-final-title">
            할 일을 적고, 첫 행동부터 시작해 보세요
          </h2>
          <p className="landing-final-copy">
            큰 계획보다, 지금 당장 움직일 수 있는 한 걸음이 먼저예요.
          </p>
          <Link className="landing-cta" to="/register">
            첫 행동 시작하기
          </Link>
        </section>
      </div>
    </div>
  );
}

export default ProjectIntro;
