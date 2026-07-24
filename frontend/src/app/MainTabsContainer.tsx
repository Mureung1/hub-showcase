import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { api } from '../api/client'
import ArticleIntroContainer from '../features/article/ArticleIntroContainer'
import MyGgaemContainer from '../features/my-ggaem/MyGgaemContainer'
import Today, { type TodayState } from '../features/today/Today'
import ContentLoadingScreen from '../shared/ui/ContentLoadingScreen/ContentLoadingScreen'

type TodayFlowState =
  | { screen: 'today' }
  | { screen: 'articleIntro'; articleId: string }

type MainTab = 'today' | 'myGgaem'

function selectArticleWithTransition(id: string, setSelectedArticleId: (id: string) => void) {
  if (typeof document.startViewTransition !== 'function') {
    setSelectedArticleId(id)
    return
  }
  document.startViewTransition(() => {
    flushSync(() => setSelectedArticleId(id))
  })
}

export default function MainTabsContainer() {
  const [tab, setTab] = useState<MainTab>('today')
  const [todayState, setTodayState] = useState<TodayState>({ status: 'loading' })
  const [flow, setFlow] = useState<TodayFlowState>({ screen: 'today' })
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)

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

  if (tab === 'myGgaem') {
    return <MyGgaemContainer onGoToToday={() => setTab('today')} />
  }

  if (todayState.status === 'loading') {
    return (
      <ContentLoadingScreen
        message="관심사에 맞는 오늘의 글을 고르고 있어요"
        description="잠시만요, 곧 준비돼요"
      />
    )
  }

  if (flow.screen === 'articleIntro') {
    return (
      <ArticleIntroContainer
        articleId={flow.articleId}
        onBack={() => setFlow({ screen: 'today' })}
        onGoToMyGgaem={() => {
          setFlow({ screen: 'today' })
          setTab('myGgaem')
        }}
      />
    )
  }

  return (
    <Today
      state={todayState}
      selectedArticleId={selectedArticleId}
      onSelectArticle={(id) => selectArticleWithTransition(id, setSelectedArticleId)}
      onOpenArticle={(articleId) => setFlow({ screen: 'articleIntro', articleId })}
      onGoToMyGgaem={() => setTab('myGgaem')}
    />
  )
}
