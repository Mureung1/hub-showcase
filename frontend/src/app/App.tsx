import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import InterestSelect from '../features/onboarding/InterestSelect'
import Today, { type TodayState } from '../features/today/Today'
import ArticleIntro, { type ArticleIntroState } from '../features/article/ArticleIntro'
import MyGgaem, { type CalendarState, type RecordsState } from '../features/my-ggaem/MyGgaem'
import ContentLoadingScreen from '../shared/ui/ContentLoadingScreen/ContentLoadingScreen'
import { api } from '../api/client'
import { ensureAnonymousSession } from '../auth/supabase'
import type { Interest } from '../api/types'
import { getKstDateString, moveDateToMonth, shiftMonth } from '../shared/lib/date'

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
    return <ContentLoadingScreen message="깸을 준비하고 있어요" description="잠시만요, 곧 준비돼요" />
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

  return <MainTabsContainer />
}

// 오늘의 깸과 글 소개 화면을 오가는 서브 화면 상태. 별도 router 없이 여기서만 전환한다.
type TodayFlowState =
  | { screen: 'today' }
  | { screen: 'articleIntro'; articleId: string }

// 오늘의 글과 나의 깸을 오가는 하단 탭 상태. 이 컨테이너는 탭이 바뀌어도 마운트 상태를
// 유지하므로, todayState/flow/selectedArticleId가 나의 깸을 다녀와도 초기화되지 않는다.
type MainTab = 'today' | 'myGgaem'

// 대표 글 선택을 View Transitions API로 감싼다. 미지원 브라우저(jsdom 포함)에서는
// document.startViewTransition이 없어 즉시 동기 갱신되므로 테스트나 폴백 동작이 기존과 같다.
function selectArticleWithTransition(id: string, setSelectedArticleId: (id: string) => void) {
  if (typeof document.startViewTransition !== 'function') {
    setSelectedArticleId(id)
    return
  }
  document.startViewTransition(() => {
    flushSync(() => setSelectedArticleId(id))
  })
}

function MainTabsContainer() {
  const [tab, setTab] = useState<MainTab>('today')
  const [todayState, setTodayState] = useState<TodayState>({ status: 'loading' })
  const [flow, setFlow] = useState<TodayFlowState>({ screen: 'today' })
  // 대표로 올린 article id. 글 소개 화면을 왕복해도 유지되도록 여기서 소유한다.
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

// 글 소개 화면에 필요한 상세 정보를 API에서 불러와 loading/error/success 상태로 전달한다.
function ArticleIntroContainer({
  articleId,
  onBack,
  onGoToMyGgaem,
}: {
  articleId: string
  onBack: () => void
  onGoToMyGgaem: () => void
}) {
  const [state, setState] = useState<ArticleIntroState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState({ status: 'loading' })
      try {
        const article = await api.getArticleDetail(articleId)
        if (cancelled) return
        setState({ status: 'success', article })
      } catch {
        if (cancelled) return
        setState({
          status: 'error',
          message: '글을 불러오지 못했어요.',
          onRetry: load,
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [articleId])

  if (state.status === 'loading') {
    return (
      <ContentLoadingScreen
        message="오늘의 글을 불러오고 있어요"
        description="잠시만요, 곧 준비돼요"
      />
    )
  }

  return (
    <ArticleIntro
      state={state}
      onBack={onBack}
      onSubmitMission={(request) => api.createMissionRecord(request)}
      onGoToMyGgaem={onGoToMyGgaem}
    />
  )
}

// 나의 깸 화면에 필요한 표시 월·선택 날짜·캘린더/기록 API 상태를 소유한다.
function MyGgaemContainer({ onGoToToday }: { onGoToToday: () => void }) {
  const [todayDate] = useState(() => getKstDateString())
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const displayMonth = selectedDate.slice(0, 7)

  const [calendarState, setCalendarState] = useState<CalendarState>({ status: 'loading' })
  const [recordsState, setRecordsState] = useState<RecordsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadCalendar() {
      setCalendarState({ status: 'loading' })
      try {
        const response = await api.getMissionRecordsCalendar(displayMonth)
        if (cancelled) return
        setCalendarState({ status: 'success', days: response.days })
      } catch {
        if (cancelled) return
        setCalendarState({
          status: 'error',
          message: '달력을 불러오지 못했어요.',
          onRetry: loadCalendar,
        })
      }
    }

    loadCalendar()
    return () => {
      cancelled = true
    }
  }, [displayMonth])

  useEffect(() => {
    let cancelled = false

    async function loadRecords() {
      setRecordsState({ status: 'loading' })
      try {
        const items = await api.getMissionRecords(selectedDate)
        if (cancelled) return
        setRecordsState({ status: 'success', items })
      } catch {
        if (cancelled) return
        setRecordsState({
          status: 'error',
          message: '기록을 불러오지 못했어요.',
          onRetry: loadRecords,
        })
      }
    }

    loadRecords()
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  return (
    <MyGgaem
      displayMonth={displayMonth}
      selectedDate={selectedDate}
      today={todayDate}
      calendarState={calendarState}
      recordsState={recordsState}
      onPrevMonth={() => setSelectedDate(moveDateToMonth(selectedDate, shiftMonth(displayMonth, -1)))}
      onNextMonth={() => setSelectedDate(moveDateToMonth(selectedDate, shiftMonth(displayMonth, 1)))}
      onSelectDate={setSelectedDate}
      onGoToToday={onGoToToday}
    />
  )
}

export default App
