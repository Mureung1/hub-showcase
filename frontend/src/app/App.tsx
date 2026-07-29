import { useEffect, useState } from 'react'
import InterestSelect from '../features/onboarding/InterestSelect'
import ContentLoadingScreen from '../shared/ui/ContentLoadingScreen/ContentLoadingScreen'
import ErrorAlertModal from '../shared/ui/ErrorAlertModal/ErrorAlertModal'
import { api } from '../api/client'
import { ensureAnonymousSession } from '../auth/supabase'
import type { Interest } from '../api/types'
import MainTabsContainer from './MainTabsContainer'

type AppState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'onboarding'; interests: Interest[]; selectedIds: string[] }
  | { status: 'today' }

function App() {
  const [appState, setAppState] = useState<AppState>({ status: 'loading' })
  const [initializationAttempt, setInitializationAttempt] = useState(0)

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
  }, [initializationAttempt])

  function retryInitialization() {
    setAppState({ status: 'loading' })
    setInitializationAttempt((attempt) => attempt + 1)
  }

  if (appState.status === 'loading') {
    return <ContentLoadingScreen message="깸을 준비하고 있어요" description="잠시만요, 곧 준비돼요" />
  }

  if (appState.status === 'error') {
    return <ErrorAlertModal onRetry={retryInitialization} />
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

  return <MainTabsContainer />
}

export default App
