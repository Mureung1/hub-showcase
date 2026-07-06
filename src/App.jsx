import React from "react";

const highlights = [
  {
    number: "01",
    title: "문제를 바라보는 새로운 시선",
    description:
      "익숙해서 지나쳤던 불편함을 발견하고, 사람들의 일상에 자연스럽게 스며드는 해결책을 고민합니다.",
  },
  {
    number: "02",
    title: "단순하지만 강력한 경험",
    description:
      "복잡한 과정은 덜어내고 가장 중요한 가치에 집중해 누구나 쉽게 사용할 수 있는 경험을 만듭니다.",
  },
  {
    number: "03",
    title: "함께 성장하는 가능성",
    description:
      "작은 아이디어에서 시작해 사용자와 함께 배우고 확장되는 지속 가능한 서비스를 지향합니다.",
  },
];

const tags = ["Web", "Mobile", "AI", "Community"];

function SparkIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3c1.4 12.8 7.2 18.6 20 20-12.8 1.4-18.6 7.2-20 20-1.4-12.8-7.2-18.6-20-20C16.8 21.6 22.6 15.8 24 3Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function App() {
  return (
    <main>
      <nav className="nav" aria-label="주요 메뉴">
        <a className="brand" href="#top" aria-label="Project Idea 홈">
          <span className="brand-mark"><SparkIcon /></span>
          <span>PROJECT IDEA</span>
        </a>
        <a className="nav-link" href="#about">
          아이디어 살펴보기 <ArrowIcon />
        </a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">A SMALL IDEA, A BIG CHANGE</p>
          <h1>
            일상의 작은<br />
            <em>가능성</em>을 발견합니다.
          </h1>
          <p className="hero-description">
            아직 이름 붙지 않은 생각에서 시작합니다.<br />
            더 나은 내일을 만드는 우리의 새로운 프로젝트를 소개합니다.
          </p>
          <a className="primary-button" href="#about">
            프로젝트 알아보기 <ArrowIcon />
          </a>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="sun" />
          <div className="spark spark-large"><SparkIcon /></div>
          <div className="spark spark-small"><SparkIcon /></div>
          <p>IMAGINE<br />WHAT&apos;S NEXT</p>
        </div>

        <span className="scroll-note">SCROLL TO EXPLORE</span>
      </section>

      <section className="about" id="about">
        <div className="section-heading">
          <p className="eyebrow">WHY THIS PROJECT?</p>
          <h2>우리가 만들고 싶은 것</h2>
          <p>
            이곳에는 프로젝트가 해결하려는 문제와 핵심 아이디어에 대한
            소개가 들어갑니다. 지금은 방향을 상상할 수 있는 문장으로 채워두었습니다.
          </p>
        </div>

        <div className="highlight-grid">
          {highlights.map((item) => (
            <article className="highlight-card" key={item.number}>
              <span className="card-number">{item.number}</span>
              <div className="card-symbol">
                <span />
                <span />
                <span />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vision">
        <div>
          <p className="eyebrow">OUR VISION</p>
          <h2>아이디어가 현실이 되는<br />순간을 함께합니다.</h2>
        </div>
        <div className="vision-content">
          <p>
            우리는 기술이 사람을 향할 때 가장 큰 의미를 가진다고 믿습니다.
            이 프로젝트는 더 쉽고, 더 즐겁고, 더 연결된 경험을 만드는 여정입니다.
          </p>
          <div className="tags" aria-label="프로젝트 분야">
            {tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top">
          <span className="brand-mark"><SparkIcon /></span>
          <span>PROJECT IDEA</span>
        </a>
        <p>© 2026 Project Idea. This is where something begins.</p>
      </footer>
    </main>
  );
}
