import { useCallback, useState } from 'react'
import SelectScreen from './screens/SelectScreen'
import StatsScreen from './screens/StatsScreen'
import ReverseScreen from './screens/ReverseScreen'
import ChecklistScreen from './screens/ChecklistScreen'
import RoadmapScreen from './screens/RoadmapScreen'

// 화면 전환은 라우터 없이 useState로 관리한다.
// screen 상태가 바뀌면 그에 맞는 화면 컴포넌트가 렌더링된다.
function App() {
  const [screen, setScreen] = useState('select')

  // 채용공고 해석·합격 전략·준비 로드맵이 공유하는 분석 범위.
  const [scope, setScope] = useState({ level: 'cluster', cluster_tag: '핀테크·금융', posting_id: null })
  // 체크 상태는 직무·기업군·공고 범위마다 분리한다.
  const [checksByScope, setChecksByScope] = useState({})
  const scopeKey = `backend:${scope.level}:${scope.cluster_tag || ''}:${scope.posting_id || ''}`
  const checks = checksByScope[scopeKey] ?? null
  const setChecks = useCallback((next) => {
    setChecksByScope((prev) => {
      const current = prev[scopeKey] ?? null
      const value = typeof next === 'function' ? next(current) : next
      return { ...prev, [scopeKey]: value }
    })
  }, [scopeKey])

  const go = (next) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  const shared = { checks, setChecks, scope, setScope }

  switch (screen) {
    case 'stats':
      return <StatsScreen go={go} />
    case 'reverse':
      return <ReverseScreen go={go} scope={scope} setScope={setScope} />
    case 'checklist':
      return <ChecklistScreen go={go} {...shared} />
    case 'roadmap':
      return <RoadmapScreen go={go} {...shared} />
    case 'select':
    default:
      return <SelectScreen go={go} />
  }
}

export default App
