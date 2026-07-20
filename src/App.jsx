import { useState } from 'react'
import { companies } from './data/mockData.js'
import Topbar from './components/Topbar.jsx'
import JobCard from './components/JobCard.jsx'
import ProjectIntro from './components/ProjectIntro.jsx'
import InterestSection from './components/InterestSection.jsx'

// App = 화면 조립 + 뷰 전환.
//  상단 탭으로 '적합도 대시보드'(fit) ↔ '프로젝트 소개'(intro) 를 오간다.
export default function App() {
  const [view, setView] = useState('fit') // 'fit' | 'intro'

  return (
    <div className="wrap">
      <Topbar view={view} onNav={setView} newCount={2} urgentCount={1} />

      {view === 'fit' ? (
        <>
          <InterestSection />
          <div className="section-label">
            <span className="num">01</span>
            <h2>채용 공고</h2>
            <span className="sub">공고별 적합도 — 펼치면 요구역량 · 개념/구현 적합도 · 갭 액션</span>
          </div>
          <div className="job-list">
            {companies.map((c) => (
              <JobCard key={c.id} job={c} defaultOpen={c.id === 'sionic'} />
            ))}
          </div>
        </>
      ) : (
        <ProjectIntro />
      )}

      <footer className="foot-note">
        mock 데이터 · 데이터 연결은 다음 단계 (React → Express → Supabase) · 디자인 = 프로토타입 v2
      </footer>
    </div>
  )
}
