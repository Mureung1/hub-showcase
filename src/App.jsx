import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import JobCard from './components/JobCard.jsx'
import LearningLoop from './components/LearningLoop.jsx'
import { jobs, learnReview, learnNew } from './data/copilotData.js'

// 섹션 번호 라벨 (01 채용 공고 / 02 학습 루프)
function SectionLabel({ num, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', rowGap: 4, gap: 10, margin: '36px 0 14px' }}>
      <span style={{ fontSize: 12, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 7px' }}>{num}</span>
      <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>{title}</h2>
      <span style={{ fontSize: 12.5, color: 'var(--text-faint)', marginLeft: 2, flexBasis: '100%' }}>{sub}</span>
    </div>
  )
}

export default function App() {
  // 테마: 라이트 기본. html 의 data-theme 로 CSS 변수를 전환한다.
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cc-theme') || 'light' } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('cc-theme', theme) } catch { /* ignore */ }
  }, [theme])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', transition: 'background .25s ease, color .25s ease' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 80px', zoom: 1.3 }}>
        <Header theme={theme} setTheme={setTheme} />

        <SectionLabel num="01" title="채용 공고" sub="공고별 적합도 — 펼치면 요구역량 · 개념/구현 적합도 · 갭 액션" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {jobs.map((job, i) => <JobCard key={i} job={job} />)}
        </div>

        <SectionLabel num="02" title="학습 루프" sub="갭은 새로 학습 · 아는 건 복습(까먹기 방지) — 전부 근거 기반" />
        <LearningLoop review={learnReview} fresh={learnNew} />

        <footer style={{ marginTop: 44, padding: '16px 4px 0', fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center', borderTop: '1px solid var(--border-soft)' }}>
          러프 프로토타입 · 예시 데이터
        </footer>
      </div>
    </div>
  )
}
