import { useState } from 'react'
import InterestSelect from './screens/InterestSelect'
import Today from './screens/Today'
import Read from './screens/Read'
import MissionScreen from './screens/Mission'
import { FEATURED_ARTICLE } from './screens/Today'
import {
  pickRandomMission,
  pickRandomSentence,
  type Mission,
} from './missions'

type Screen = 'onboarding' | 'today' | 'read' | 'mission'

function App() {
  const [screen, setScreen] = useState<Screen>('onboarding')

  // 미션은 읽기 화면을 떠날 때 한 번 정해진다. 정해진 결과를 여기에 담아둔다.
  const [mission, setMission] = useState<Mission | null>(null)
  const [selectedQuote, setSelectedQuote] = useState('')

  // 하이라이트 여러 개 중 하나를 골라 미션 하나만 낸다 (03-feature-details.md).
  // 랜덤은 렌더링 중이 아니라 이벤트 핸들러에서 뽑는다. 렌더링 중에 뽑으면
  // 화면이 다시 그려질 때마다 미션이 바뀐다.
  function handleRequestMission(highlightedSentences: string[]) {
    setSelectedQuote(pickRandomSentence(highlightedSentences))
    setMission(pickRandomMission())
    setScreen('mission')
  }

  function handleSubmitAnswer(answer: string) {
    // 저장은 아직 없다. API 연결 시 POST /api/mission-records로 보낸다.
    console.log('기록:', answer)
    setScreen('today')
  }

  if (screen === 'onboarding') {
    return <InterestSelect onComplete={() => setScreen('today')} />
  }

  if (screen === 'today') {
    return <Today onSelectArticle={() => setScreen('read')} />
  }

  if (screen === 'read') {
    return (
      <Read
        article={FEATURED_ARTICLE}
        onBack={() => setScreen('today')}
        onRequestMission={handleRequestMission}
      />
    )
  }

  // 미션 화면은 mission이 정해진 뒤에만 도달한다. 없으면 홈을 보여준다.
  // 렌더링 중에는 setState를 호출하지 않는다.
  if (!mission) {
    return <Today onSelectArticle={() => setScreen('read')} />
  }

  return (
    <MissionScreen
      mission={mission}
      selectedQuote={selectedQuote}
      onBack={() => setScreen('read')}
      onSubmit={handleSubmitAnswer}
    />
  )
}

export default App
