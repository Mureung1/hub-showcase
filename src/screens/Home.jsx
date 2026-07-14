import { Link } from 'react-router'
import logo from '../assets/logo.png'
import './Home.css'

const GUIDE_STEPS = [
  { title: '회원가입 및 시작', desc: '회원 중 한 명이 회원가입 후, "새 프로젝트 생성하기"를 클릭합니다.' },
  { title: '정보 입력 및 일정 설정', desc: "프로젝트 정보를 입력합니다. 이때, 캘린더에 '기피 날짜'를 표시하면 해당 날짜를 제외한 기간으로 계획합니다." },
  { title: 'AI 플래닝 및 수정', desc: '에이전트가 역할 정의, 마일스톤, 태스크를 생성하며 사용자가 직접 수정하거나 다시 제안받을 수 있습니다. (최대 3회)' },
  { title: '팀원 초대', desc: '프로젝트 확정 시, 팀원들을 위한 전용 초대 링크가 발급됩니다.' },
  { title: '팀원 합류', desc: '팀원들이 링크로 접속해 회원가입과 닉네임을 입력하고, 성향 설문에 응답합니다.' },
  { title: '자동 역할 배정', desc: '모든 팀원이 설문을 마치면 AI가 데이터 기반으로 역할 배정을 자동으로 진행합니다.' },
  { title: '프로젝트 협업', desc: '상태(할 일/진행중/완료) 관리, 파일 업로드, 코멘트 등 핵심 기능을 통해 협업합니다.' },
  { title: '프로젝트 완료', desc: '모든 목표가 달성되면 "프로젝트 완료" 버튼으로 깔끔하게 종료하고 결과물을 보관합니다.' },
]

export default function Home() {
  return (
    <div className="home">
      <header className="home-nav">
        <Link to="/" className="home-brand">
          <img src={logo} alt="팀플, 이지! 로고" />
          <span>팀플, 이지!</span>
        </Link>
        <nav className="home-menu">
          <a href="#top">Home</a>
          <a href="#agents">Features</a>
          <a href="#guide">Guide</a>
        </nav>
        <div className="home-nav-actions">
          <Link to="/login" className="home-login-link">로그인</Link>
          <Link to="/signup" className="btn btn-dark home-nav-cta">시작하기</Link>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <span className="chip">✨ Your AI-Powered Team Mate</span>
          <h1>
            복잡한 협업의 시작을
            <br />
            <em>팀플, 이지!</em>로 더 가볍게
          </h1>
          <p className="hero-sub">
            팀플, 이지!는 AI 에이전트를 기반으로 역할 배정과 마일스톤,
            <br />
            할 일을 생성해주는 지능형 협업 도구입니다.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-dark">🚀 지금 무료로 시작하기</Link>
          </div>
        </section>

        <section className="agents" id="agents">
          <h2>팀 프로젝트를 도와주는 두개의 에이전트</h2>
          <p className="section-sub">
            역할 배정 에이전트와 플래닝 에이전트가 여러분의 팀 프로젝트를 도와줍니다.
          </p>
          <div className="agent-cards">
            <article className="agent-card">
              <span className="agent-icon" aria-hidden="true">👥</span>
              <h3>역할 배정 에이전트</h3>
              <p>
                팀원들의 설문 응답을 기반으로 가장 적합한 역할을 자동으로 배정해주는 지능형
                에이전트입니다. 개개인의 강점과 선호도를 분석하여 최적의 팀 구성을 제안합니다.
              </p>
              <a href="#guide" className="agent-more">Learn more →</a>
            </article>
            <article className="agent-card">
              <span className="agent-icon" aria-hidden="true">📋</span>
              <h3>플래닝 에이전트</h3>
              <p>
                프로젝트 주제와 기피 날짜를 고려하여 최적의 마일스톤과 상세 태스크를 설계해주는
                기획 에이전트입니다. 마감 기한을 준수하면서도 팀원들의 여유를 고려한 스케줄링을 지원합니다.
              </p>
              <a href="#guide" className="agent-more">Learn more →</a>
            </article>
          </div>
        </section>

        <section className="guide" id="guide">
          <h2>팀플, 이지! 사용 가이드</h2>
          <p className="section-sub">단 8단계면 완벽한 팀 프로젝트 준비가 끝납니다.</p>
          <ol className="guide-grid">
            {GUIDE_STEPS.map((step, i) => (
              <li className="guide-step" key={step.title}>
                <span className="guide-num">{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="cta" id="cta">
          <div className="cta-banner">
            <h2>
              더 똑똑하고 편한 팀워크,
              <br />
              지금 바로 시작해보세요.
            </h2>
            <p>팀플의 번거로움은 저희에게 맡기고, 여러분은 창의적인 활동에만 집중하세요.</p>
            <Link to="/signup" className="btn cta-btn">무료로 시작하기</Link>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-brand">
          <div className="home-brand">
            <img src={logo} alt="" />
            <span>팀플, 이지!</span>
          </div>
          <p>
            AI 에이전트와 함께하는 가장 쉬운 팀 프로젝트 관리 플랫폼.
            <br />
            "Effortless Collaboration"
          </p>
        </div>
        <p className="footer-copy">© 2026 팀플, 이지! All rights reserved.</p>
      </footer>
    </div>
  )
}
