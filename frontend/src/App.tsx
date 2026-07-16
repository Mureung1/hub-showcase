import { useEffect, useState } from 'react'
import InterestSelect from './screens/InterestSelect'
import Today from './screens/Today'
import Read from './screens/Read'
import MissionScreen from './screens/Mission'
import { FEATURED_ARTICLE } from './screens/Today'
import { api } from './api/client'
import { ensureAnonymousSession } from './lib/supabase'
import type { Interest } from './api/types'
import {
  pickRandomMission,
  pickRandomSentence,
  type Mission,
} from './missions'

type AppState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'onboarding'; interests: Interest[]; selectedIds: string[] }
  | { status: 'today' }

function App() {
  const [appState, setAppState] = useState<AppState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        await ensureAnonymousSession()
        const userInterests = await api.getUserInterests()
        if (cancelled) return

        if (userInterests.hasCompletedOnboarding) {
          setAppState({ status: 'today' })
          return
        }

        const interests = await api.getInterests()
        if (cancelled) return
        setAppState({ status: 'onboarding', interests, selectedIds: [] })
      } catch {
        if (!cancelled) setAppState({ status: 'error' })
      }
    }

    start()
    return () => {
      cancelled = true
    }
  }, [])

  if (appState.status === 'loading') {
    return <p role="status">불러오고 있어요...</p>
  }

  if (appState.status === 'error') {
    return <p role="alert">불러오지 못했어요. 새로고침해 주세요.</p>
  }

  if (appState.status === 'onboarding') {
    return (
      <InterestSelect
        interests={appState.interests}
        initialSelectedIds={appState.selectedIds}
        onSave={(interestIds) => api.replaceUserInterests(interestIds)}
        onComplete={() => setAppState({ status: 'today' })}
      />
    )
  }

  return <TodayFlow />
}

// 온보딩 이후의 오늘의 글 -> 읽기 -> 미션 흐름.
// Today/Read/Mission의 실제 API 연결은 별도 작업에서 이어진다.
function TodayFlow() {
  const [screen, setScreen] = useState<'today' | 'read' | 'mission'>('today')

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
