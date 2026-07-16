import { useState } from 'react'
import TopBar from '../components/TopBar'
import { SUPPORTED_JOB, BASELINE, DEVIATIONS, POSTING, CLUSTER_NAME, CONFIDENCE_LABEL } from '../data/mock'

// 03 인재상 역산. view 상태(전체/기업군/개별)에 따라 다른 내용을 보여준다.
function ReverseScreen({ go }) {
  const [view, setView] = useState('all')

  const tabs = [
    { id: 'all', label: '전체 (baseline)' },
    { id: 'cluster', label: `기업군 (${CLUSTER_NAME})` },
    { id: 'posting', label: '개별 공고' },
  ]

  return (
    <>
      <TopBar step={3} label="인재상 역산" job={SUPPORTED_JOB} backTo="stats" backLabel="통계" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header">
            <span className="eyebrow">baseline 대비 편차 역산</span>
            <h1>공고가 반복하는 문장 뒤에서, 이 회사·기업군이 유독 원하는 지점을 되짚습니다.</h1>
            <p>전체는 직군 공통 기대치(baseline)를 보여 주고, 기업군·개별 공고는 그 기준 위에서 더 높거나 추가로 요구되는 부분을 편차로 강조합니다. 아래 탭으로 뷰를 바꿔 보세요.</p>
            <div className="view-tabs" role="tablist" aria-label="역산 뷰">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`view-tab${view === t.id ? ' is-current' : ''}`}
                  aria-selected={view === t.id}
                  onClick={() => setView(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </header>

          {view === 'all' && (
            <section className="section-block">
              <div className="section-title">
                <h2>전체 · 백엔드 신입 공통 기대치 (baseline)</h2>
                <span className="hint">회사와 무관한 기준선</span>
              </div>
              <div className="panel">
                <div className="requirement-list">
                  {BASELINE.map((b) => (
                    <div className="requirement-item" key={b.title}>
                      <strong>{b.title}</strong>
                      <p>{b.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {view === 'cluster' && (
            <section className="section-block">
              <div className="section-title">
                <h2>기업군 · {CLUSTER_NAME}이 baseline 위에서 더 요구하는 것</h2>
                <span className="hint">편차 항목만 펼침 · baseline과 같은 항목은 접힘</span>
              </div>
              <div className="insight-grid">
                {DEVIATIONS.map((d) => (
                  <article className="insight-card" key={d.topic}>
                    <div className="insight-head">
                      <h3>{d.topic}</h3>
                      <span className={`confidence confidence--${d.confidence}`}>{CONFIDENCE_LABEL[d.confidence]}</span>
                    </div>
                    <div className="insight-levels">
                      <div><span className="insight-label">baseline</span> {d.baseline}</div>
                      <div><span className="insight-label insight-label--diff">편차</span> {d.deviation}</div>
                    </div>
                    <p className="insight-evidence">{d.evidence}</p>
                    <div className="insight-foot"><span className="ratio-pill">{d.ratio}</span></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === 'posting' && (
            <section className="section-block">
              <div className="section-title">
                <h2>개별 공고 · {POSTING.company}</h2>
                <span className="hint">공고 원문 + 편차 해석</span>
              </div>
              <div className="panel">
                <div className="posting-quote">
                  <blockquote>{POSTING.quote}</blockquote>
                  <p className="posting-interpret">
                    <strong>해석 ·</strong> {POSTING.interpret}
                    <span className={`confidence confidence--${POSTING.confidence}`}>{CONFIDENCE_LABEL[POSTING.confidence]} · 근거 문장 명확</span>
                  </p>
                </div>
                <p className="panel-note">{POSTING.note}</p>
              </div>
            </section>
          )}

          <div className="nav-actions">
            <button className="btn btn-secondary" onClick={() => go('stats')}>← 통계 다시 보기</button>
            <button className="btn btn-primary" onClick={() => go('checklist')}>합격 조건 정의 보기 →</button>
          </div>
        </article>

        <aside className="floating-nav" aria-label="역산 뷰">
          <p className="floating-nav__label">역산 뷰</p>
          {tabs.map((t) => (
            <a
              key={t.id}
              className={view === t.id ? 'is-current' : ''}
              href="#top"
              onClick={(e) => { e.preventDefault(); setView(t.id) }}
            >
              <span className="dot"></span>{t.label}
            </a>
          ))}
        </aside>
      </main>
    </>
  )
}

export default ReverseScreen
