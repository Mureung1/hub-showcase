import { Link } from 'react-router-dom'
import './Intro.css'

const menuItems = [
  {
    to: '/overview',
    emoji: '📖',
    title: '프로젝트 개요',
    desc: '우리결이 어떤 서비스인지 소개할게요',
  },
  {
    to: '/problem',
    emoji: '🤔',
    title: '해결하려는 문제',
    desc: '우리가 왜 이 서비스를 만들었는지 알려드려요',
  },
  {
    to: '/service-flow',
    emoji: '🛤️',
    title: '서비스 흐름',
    desc: '가입부터 매칭까지 여정을 따라가봐요',
  },
]

function Intro() {
  return (
    <div className="intro-page">
      <div className="intro-blob intro-blob-1" aria-hidden="true" />
      <div className="intro-blob intro-blob-2" aria-hidden="true" />
      <div className="intro-blob intro-blob-3" aria-hidden="true" />
      <div className="intro-inner">
        <div className="intro-logo-wrap">
          <img src="/logo.png" alt="우리결 로고" className="intro-logo" />
          <h1 className="intro-title">우리결</h1>
          <p className="intro-subtitle">결이 맞는 사람을 찾아가는 여정 ✨</p>
        </div>

        <nav className="intro-menu">
          {menuItems.map((item) => (
            <Link to={item.to} key={item.to} className="intro-card">
              <span className="intro-card-emoji">{item.emoji}</span>
              <span className="intro-card-text">
                <span className="intro-card-title">{item.title}</span>
                <span className="intro-card-desc">{item.desc}</span>
              </span>
              <span className="intro-card-arrow">→</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default Intro
