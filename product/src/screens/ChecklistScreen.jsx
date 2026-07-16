import { useState } from 'react'
import TopBar from '../components/TopBar'
import { SUPPORTED_JOB, CHECKLIST, CHANNELS } from '../data/mock'

// 04 합격 조건. 각 항목의 보유/미보유를 클릭으로 토글한다(checks 상태).
function ChecklistScreen({ go }) {
  const [checks, setChecks] = useState(CHECKLIST.map((c) => c.has))

  const toggle = (i) => {
    setChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  const todoCount = checks.filter((v) => !v).length

  return (
    <>
      <TopBar step={4} label="합격 조건" job={SUPPORTED_JOB} backTo="reverse" backLabel="역산" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header">
            <span className="eyebrow">자소서 · 포트폴리오 · 면접 배정</span>
            <h1>역산 결과를 지원 준비의 어디에 담을지, 활용처별로 나눠 정리합니다.</h1>
            <p>각 요구 항목을 자소서·포트폴리오·면접 중 맞는 곳으로 배정했습니다. 보유/미보유를 눌러 표시해 보세요. 미보유 항목은 다음 단계 로드맵으로 이어집니다.</p>
          </header>

          <section className="section-block" id="table">
            <div className="section-title">
              <h2>합격 조건 체크리스트</h2>
              <span className="hint">요구 항목 · 필요 산출물/활동 · 활용처 · 보유</span>
            </div>
            <div className="panel">
              <table className="checklist">
                <thead>
                  <tr>
                    <th>요구 항목</th>
                    <th>필요 산출물/활동</th>
                    <th>활용처</th>
                    <th>보유</th>
                  </tr>
                </thead>
                <tbody>
                  {CHECKLIST.map((row, i) => (
                    <tr key={row.item}>
                      <td>{row.item}</td>
                      <td>{row.evidence}</td>
                      <td>{row.channel}</td>
                      <td>
                        <button
                          type="button"
                          className={`check ${checks[i] ? 'check--done' : 'check--todo'}`}
                          onClick={() => toggle(i)}
                        >
                          {checks[i] ? '☑ 보유' : '☐ 미보유'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="panel-note">☐ 미보유 {todoCount}개 항목이 다음 단계 준비 로드맵으로 전달됩니다.</p>
            </div>
          </section>

          <section className="section-block" id="channels">
            <div className="section-title">
              <h2>활용처별로 무엇을 담을까</h2>
              <span className="hint">자소서 · 포트폴리오 · 면접</span>
            </div>
            <div className="triple-grid">
              {CHANNELS.map((ch) => (
                <div className="panel" id={ch.id} key={ch.id}>
                  <span className="section-kicker">{ch.kicker}</span>
                  <ul className="channel-list">
                    {ch.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <div className="nav-actions">
            <button className="btn btn-secondary" onClick={() => go('reverse')}>← 역산 다시 보기</button>
            <button className="btn btn-primary" onClick={() => go('roadmap')}>준비 로드맵 보기 →</button>
          </div>
        </article>

        <aside className="floating-nav" aria-label="합격 조건 목차">
          <p className="floating-nav__label">합격 조건</p>
          <a className="is-current" href="#table"><span className="dot"></span>체크리스트</a>
          <a href="#channels"><span className="dot"></span>활용처별 내용</a>
        </aside>
      </main>
    </>
  )
}

export default ChecklistScreen
