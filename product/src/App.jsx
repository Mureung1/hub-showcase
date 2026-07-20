import { useState } from 'react'
import SelectScreen from './screens/SelectScreen'
import StatsScreen from './screens/StatsScreen'
import ReverseScreen from './screens/ReverseScreen'
import ChecklistScreen from './screens/ChecklistScreen'
import RoadmapScreen from './screens/RoadmapScreen'

// 화면 전환은 라우터 없이 useState로 관리한다.
// screen 상태가 바뀌면 그에 맞는 화면 컴포넌트가 렌더링된다.
function App() {
  const [screen, setScreen] = useState('select')

  // 합격 조건·로드맵이 공유하는 상태.
  // checks: item_id → 보유 여부 (로그인 없는 MVP에서는 이 상태가 저장의 전부)
  // scope: 마지막으로 선택한 범위 — 로드맵이 합격 조건의 선택을 이어받는다
  const [checks, setChecks] = useState(null)
  const [scope, setScope] = useState({ level: 'cluster', cluster_tag: '핀테크·금융', posting_id: null })

  const go = (next) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  const shared = { checks, setChecks, scope, setScope }

  switch (screen) {
    case 'stats':
      return <StatsScreen go={go} />
    case 'reverse':
      return <ReverseScreen go={go} />
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
