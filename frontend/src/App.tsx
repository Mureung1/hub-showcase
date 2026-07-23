import { useEffect, useState } from 'react'
import InterestSelect from './screens/InterestSelect'
import Today, { type TodayState } from './screens/Today'
import ArticleIntro, { type ArticleIntroState } from './screens/ArticleIntro'
import MyGgaem, { type CalendarState, type RecordsState } from './screens/MyGgaem'
import ContentLoadingScreen from './components/ContentLoadingScreen'
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
      onSelectArticle={setSelectedArticleId}
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

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

// Intl.DateTimeFormat + formatToParts로 브라우저 로컬 시간대나 locale 문자열 포맷에 기대지 않고
// Asia/Seoul 기준 오늘 날짜(YYYY-MM-DD)를 만든다.
function getKstTodayDateString(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

// displayMonth(YYYY-MM)에서 delta개월 이동한 월을 Date.UTC로 계산한다.
function shiftMonth(displayMonth: string, delta: number): string {
  const [year, month] = displayMonth.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}`
}

// targetMonth(YYYY-MM)의 마지막 날짜를 Date.UTC로 계산한다.
function lastDayOfMonth(targetMonth: string): number {
  const [year, month] = targetMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// date(YYYY-MM-DD)의 일(day)을 유지한 채 targetMonth로 옮긴다. 대상 월에 그 일자가 없으면
// 마지막 날로 보정한다.
function moveDateToMonth(date: string, targetMonth: string): string {
  const day = Number(date.split('-')[2])
  const clampedDay = Math.min(day, lastDayOfMonth(targetMonth))
  return `${targetMonth}-${pad2(clampedDay)}`
}

// 나의 깸 화면에 필요한 표시 월·선택 날짜·캘린더/기록 API 상태를 소유한다.
function MyGgaemContainer({ onGoToToday }: { onGoToToday: () => void }) {
  const [todayDate] = useState(() => getKstTodayDateString())
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
