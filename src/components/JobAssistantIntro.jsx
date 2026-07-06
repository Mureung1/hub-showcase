import { useState } from 'react'

const FEATURES = [
  {
    title: '맞춤형 채용공고 추천',
    summary: '사용자의 이력서와 희망 조건을 분석해 적합한 채용공고를 우선순위로 추천합니다.',
  },
  {
    title: '이력서 · 자기소개서 분석',
    summary: '작성한 이력서와 자기소개서의 강점과 보완점을 짚어주고 개선 방향을 제안합니다.',
  },
  {
    title: 'AI 모의 면접',
    summary: '지원 직무에 맞춘 예상 질문으로 모의 면접을 진행하고 답변 피드백을 제공합니다.',
  },
  {
    title: '취업 일정 관리',
    summary: '지원 마감일, 서류 결과, 면접 일정을 한곳에서 관리하고 알림을 받습니다.',
  },
]

function JobAssistantIntro() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedFeature = FEATURES[selectedIndex]

  return (
    <main className="intro">
      <header className="intro__header">
        <p className="intro__eyebrow">Project</p>
        <h1 className="intro__title">개인 맞춤형 취업비서</h1>
        <p className="intro__subtitle">
          취업 준비의 모든 과정을 한 사람의 비서처럼 곁에서 챙겨주는 서비스입니다.
        </p>
      </header>

      <section className="intro__section">
        <h2 className="intro__section-title">핵심 기능</h2>
        <div className="feature-grid">
          {FEATURES.map((feature, index) => (
            <button
              key={feature.title}
              type="button"
              className={
                'feature-card' + (index === selectedIndex ? ' feature-card--active' : '')
              }
              onClick={() => setSelectedIndex(index)}
            >
              {feature.title}
            </button>
          ))}
        </div>
        <p className="feature-detail">{selectedFeature.summary}</p>
      </section>

      <footer className="intro__footer">
        <p>목표: 취업 준비생 개개인의 상황에 맞춘 정보와 피드백을 제공하여 취업 성공률을 높입니다.</p>
      </footer>
    </main>
  )
}

export default JobAssistantIntro
