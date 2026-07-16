import { useEffect, useState } from 'react'
import InterestSelect from './screens/InterestSelect'
import Today, { type TodayState } from './screens/Today'
import { api } from './api/client'
import { ensureAnonymousSession } from './lib/supabase'
import type { Interest } from './api/types'

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

  return <TodayContainer />
}

// 오늘의 깸 카드 목록을 API에서 불러와 loading/error/empty/list 네 상태로 전달한다.
function TodayContainer() {
  const [todayState, setTodayState] = useState<TodayState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setTodayState({ status: 'loading' })
      try {
        const response = await api.getTodayArticles()
        if (cancelled) return
        setTodayState({
          status: 'success',
          items: response.items,
          emptyStateMessage: response.emptyStateMessage,
        })
      } catch {
        if (cancelled) return
        setTodayState({
          status: 'error',
          message: '오늘의 글을 불러오지 못했어요.',
          onRetry: load,
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return <Today state={todayState} />
}

export default App
