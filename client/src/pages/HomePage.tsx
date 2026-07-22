import { Link } from 'react-router'
import ScreenHint from '../components/ScreenHint.tsx'
import heroImage from '../assets/hero.svg'
import './HomePage.css'

function HomePage() {
  return (
    <div className="page-stack transition-slide-up">
      <div className="home-hero">
        <h1 className="home-hero__title">
          가능한 시간을 넘어,
          <br />
          <span className="home-hero__highlight">더 좋은 시간을</span>.
        </h1>
        <p className="home-hero__desc">
          각자의 선호까지 반영해서, 모두에게 가장 만족스러운 시간을 찾아드려요.
        </p>
      </div>
      <div className="home-hero__image">
        <img src={heroImage} alt="달력과 시계로 표현한 약속 시간 조율 이미지" />
      </div>
      <div className="home-guide">
        <span className="home-guide__label">이렇게 진행돼요</span>
        <ol className="home-guide__list">
          <li>
            <span className="home-guide__step">1</span>
            링크에 접속해요
          </li>
          <li>
            <span className="home-guide__step">2</span>
            만날 수 있는 시간을 선택해요
          </li>
          <li>
            <span className="home-guide__step">3</span>
            그 중 더 선호하는 시간을 추가로 표시해요
          </li>
          <li>
            <span className="home-guide__step">4</span>
            결과를 확인해요
          </li>
        </ol>
      </div>
      <ScreenHint text="새 약속을 만들거나, 공유받은 약속에 참여해보세요." className="screen-hint--center" />
      <div className="home-actions">
        <Link to="/new" className="button">
          약속 만들기
        </Link>
        <Link to="/join" className="button button--secondary">
          기존 약속 참여하기
        </Link>
      </div>
    </div>
  )
}

export default HomePage
