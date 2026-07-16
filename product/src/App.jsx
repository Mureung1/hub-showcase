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

  const go = (next) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }

  switch (screen) {
    case 'stats':
      return <StatsScreen go={go} />
    case 'reverse':
      return <ReverseScreen go={go} />
    case 'checklist':
      return <ChecklistScreen go={go} />
    case 'roadmap':
      return <RoadmapScreen go={go} />
    case 'select':
    default:
      return <SelectScreen go={go} />
  }
}

export default App
