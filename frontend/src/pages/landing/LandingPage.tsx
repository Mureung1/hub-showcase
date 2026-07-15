import { useState } from 'react'
import heroImage from '../../assets/iris-hero.png'
import logoImage from '../../assets/iris-logo.png'
import { FeatureIcon } from './FeatureIcon'
import { featureCards, guideCards } from './landingData'
import './landing.css'

function LandingPage() {
  const [isGuideVisible, setIsGuideVisible] = useState(false)
  const [inviteNotice, setInviteNotice] = useState('')
  const discordInviteUrl = import.meta.env.VITE_DISCORD_INVITE_URL

  const handleInviteClick = () => {
    if (discordInviteUrl) {
      window.open(discordInviteUrl, '_blank', 'noopener,noreferrer')
      return
    }

    setInviteNotice('Discord Bot 초대 링크는 Discord 앱 등록 후 연결됩니다.')
  }

  return (
    <main className="landing-shell" id="app">
      <section className="landing-page" aria-labelledby="landing-title">
        <header className="landing-header">
          <a className="brand" href="/" aria-label="IRIS 홈">
            <img src={logoImage} alt="" />
            <span>IRIS</span>
          </a>
        </header>

        <div className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Discord University Notice Service</p>
            <h1 id="landing-title">
              필요한 대학 공지를
              <br />
              Discord에서 더 편하게
            </h1>
            <p className="hero-description">
              IRIS는 대학 공지를 자동으로 수집해 Discord로 전달하는 봇입니다. 카테고리 알림과 키워드
              DM으로 필요한 공지만 빠르게 받아보세요.
            </p>

            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={handleInviteClick}>
                <svg className="discord-button-icon" aria-hidden="true">
                  <use href="/icons.svg#discord-icon" />
                </svg>
                Discord 봇 초대하기
              </button>
              <button
                className="button button-secondary"
                type="button"
                aria-pressed={isGuideVisible}
                onClick={() => setIsGuideVisible((current) => !current)}
              >
                {isGuideVisible ? '기능 소개' : '시작 가이드'}
              </button>
            </div>

            <p className="invite-notice" aria-live="polite">
              {inviteNotice}
            </p>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
        </div>

        <section
          className="card-grid"
          aria-label={isGuideVisible ? 'IRIS 시작 가이드' : 'IRIS 핵심 기능'}
        >
          {isGuideVisible
            ? guideCards.map((card) => (
                <article className="info-card guide-card" key={card.step}>
                  <span className="step-badge">{card.step}</span>
                  <div>
                    <h2>{card.title}</h2>
                    <p>{card.description}</p>
                  </div>
                </article>
              ))
            : featureCards.map((card) => (
                <article className="info-card" key={card.title}>
                  <div className="feature-icon">
                    <FeatureIcon icon={card.icon} />
                  </div>
                  <div>
                    <h2>{card.title}</h2>
                    <p>{card.description}</p>
                  </div>
                </article>
              ))}
        </section>
      </section>
    </main>
  )
}

export default LandingPage
