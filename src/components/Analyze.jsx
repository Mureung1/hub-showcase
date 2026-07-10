import { Link } from 'react-router-dom'

// 2 · 프로필 분석 중
const ANALYZE_STEPS = [
  {
    state: 'done',
    icon: '✓',
    title: '공개 레포·커밋 수집',
    meta: '본인이 기여한 레포만 · 최근 12개월',
  },
  {
    state: 'active',
    icon: '2',
    title: '언어·활동 분석',
    meta: '빌드·자동생성 파일은 빼고, 실제 작성한 코드만 집계해요',
  },
  {
    state: 'pending',
    icon: '3',
    title: '실력·관심 영역 추정',
    meta: '기여 패턴으로 난이도와 관심 분야를 가늠해요',
  },
]

function Analyze() {
  return (
    <div className="panel">
      <h1 className="a-title">
        <span className="spinner" />
        활동을 살펴보고 있어요
      </h1>
      <p className="a-lead">@sunho-kim 님의 공개 GitHub 활동을 분석 중이에요.</p>
      <ul className="steps">
        {ANALYZE_STEPS.map((step) => (
          <li key={step.title} className={`step-${step.state}`}>
            <div className="st-icon">{step.icon}</div>
            <div className="st-title">{step.title}</div>
            <div className="st-meta">{step.meta}</div>
          </li>
        ))}
      </ul>
      <Link to="/profile" className="btn btn-primary btn-block">
        분석 결과 보기
      </Link>
    </div>
  )
}

export default Analyze
