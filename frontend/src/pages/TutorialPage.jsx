import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepProgress from '../components/StepProgress.jsx'
import { tutorialSteps } from '../data/tutorial.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './TutorialPage.css'

function TutorialPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [index, setIndex] = useState(0)
  const [practice, setPractice] = useState('')

  const step = tutorialSteps[index]
  const isLast = index === tutorialSteps.length - 1
  const labels = tutorialSteps.map((s) => s.label)

  async function finish() {
    // 로그인 사용자면 튜토리얼 완료 시각을 기록(선택적, 실패해도 무시).
    if (auth.isAuthEnabled && auth.isLoggedIn) {
      try {
        await auth.updateProfile({ onboardedAt: new Date().toISOString() })
      } catch {
        /* noop */
      }
    }
    navigate('/write')
  }

  return (
    <section className="rs-tutorial">
      <header className="rs-page-head">
        <h1>튜토리얼</h1>
        <p>역기획서와 게임 기획이 처음이어도 괜찮아요. 4단계면 감이 잡힙니다.</p>
      </header>

      <StepProgress total={tutorialSteps.length} current={index} labels={labels} />

      <article className="rs-panel rs-tutorial-card">
        <h2 className="rs-tutorial-title">{step.title}</h2>
        {step.body.map((p, i) => (
          <p key={i} className="rs-tutorial-body">
            {p}
          </p>
        ))}

        {step.cards && (
          <div className="rs-tutorial-cards">
            {step.cards.map((c) => (
              <div key={c.name} className="rs-tutorial-typecard">
                <h3>{c.name}</h3>
                <p className="rs-tutorial-typedesc">{c.desc}</p>
                <p className="rs-tutorial-typeex">{c.ex}</p>
              </div>
            ))}
          </div>
        )}

        {step.compare && (
          <div className="rs-tutorial-compare">
            <div className="rs-tutorial-compare-col is-weak">
              <span className="rs-tutorial-compare-label">{step.compare.weak.label}</span>
              <p>{step.compare.weak.text}</p>
            </div>
            <div className="rs-tutorial-compare-col is-good">
              <span className="rs-tutorial-compare-label">{step.compare.good.label}</span>
              <p>{step.compare.good.text}</p>
            </div>
          </div>
        )}

        {step.practice && (
          <textarea
            className="rs-tutorial-practice"
            value={practice}
            onChange={(e) => setPractice(e.target.value)}
            placeholder={step.practice.placeholder}
            rows={4}
          />
        )}
      </article>

      <div className="rs-tutorial-nav">
        <button
          className="rs-btn"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          이전
        </button>
        <span className="rs-tutorial-count">
          {index + 1} / {tutorialSteps.length}
        </span>
        {isLast ? (
          <button className="rs-btn rs-btn-primary" onClick={finish}>
            작성하기로 이동
          </button>
        ) : (
          <button className="rs-btn rs-btn-primary" onClick={() => setIndex((i) => i + 1)}>
            다음
          </button>
        )}
      </div>
    </section>
  )
}

export default TutorialPage
