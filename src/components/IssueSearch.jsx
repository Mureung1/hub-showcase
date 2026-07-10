import { Link } from 'react-router-dom'

// 4 · 이슈 검색 (에이전트)
const SEARCH_STEPS = [
  {
    state: 'done',
    icon: '✓',
    title: '맞춤 이슈 검색',
    meta: (
      <>
        <code>good first issue</code> · <code>JavaScript</code> · <code>웹</code> → <b>42건</b> 발견
      </>
    ),
  },
  {
    state: 'done',
    icon: '✓',
    title: '활발한 레포만 남기기',
    meta: '방치된 레포는 걸러내고 유지보수가 활발한 곳만 추렸어요',
  },
  {
    state: 'active',
    icon: '3',
    title: '후보 이슈 살펴보는 중',
    meta: '유망한 상위 6개 이슈의 본문·필요 기술을 직접 확인하고 있어요',
  },
  {
    state: 'pending',
    icon: '4',
    title: '추천 이유 정리',
    meta: '왜 나에게 맞는지 한 줄로 정리해드려요',
  },
]

function IssueSearch() {
  return (
    <>
      <div className="panel">
        <h1 className="a-title">
          <span className="spinner" />
          이슈를 찾고 있어요
        </h1>
        <p className="a-lead">조건에 맞는 이슈를 검색하고, 스스로 다듬어가며 골라요.</p>
        <ul className="steps">
          {SEARCH_STEPS.map((step) => (
            <li key={step.title} className={`step-${step.state}`}>
              <div className="st-icon">{step.icon}</div>
              <div className="st-title">{step.title}</div>
              <div className="st-meta">{step.meta}</div>
            </li>
          ))}
        </ul>
        <Link to="/result" className="btn btn-primary btn-block">
          추천 결과 보기
        </Link>
      </div>
      <p className="foot-note">실제 서비스에선 이 화면이 자동으로 넘어가요</p>
    </>
  )
}

export default IssueSearch
