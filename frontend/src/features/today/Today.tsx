import ArticleCard from './components/ArticleCard'
import type { TodayArticle } from '../../api/types'
import mascotMy from '../../assets/mascot/mascot-my.png'
import './Today.css'

export type TodayState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; items: TodayArticle[]; emptyStateMessage: string | null }

type TodayProps = {
  state: TodayState
  // 대표로 올릴 article id. 화면을 왕복해도 유지되도록 상위(App)가 소유한다.
  selectedArticleId?: string | null
  onSelectArticle?: (articleId: string) => void
  onOpenArticle?: (articleId: string) => void
  onGoToMyGgaem?: () => void
}

// KST 기준 "7월 8일 화요일" 형식. 자정 근처 로컬 시간대 오차를 피하려고 Asia/Seoul을 고정한다.
function formatTodayHeaderDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)
}

export default function Today({
  state,
  selectedArticleId = null,
  onSelectArticle = () => {},
  onOpenArticle = () => {},
  onGoToMyGgaem = () => {},
}: TodayProps) {
  const today = formatTodayHeaderDate(new Date())

  const items = state.status === 'success' ? state.items : []
  const featureArticle = items.find((article) => article.id === selectedArticleId) ?? items[0]
  const compactArticles = items.filter((article) => article.id !== featureArticle?.id)

  return (
    <div className="app-shell">
      <header className="today-header">
        <div className="today-header-copy">
          <h1>오늘의 깸</h1>
          <p className="today-header-date">{today}</p>
        </div>
        <img className="today-mascot" src={mascotMy} alt="" aria-hidden="true" />
      </header>

      <main className="screen-main">
        {state.status === 'loading' && <p role="status">불러오고 있어요...</p>}

        {state.status === 'error' && (
          <div role="alert">
            <p>{state.message}</p>
            <button type="button" className="btn-primary" onClick={state.onRetry}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' && state.items.length === 0 && (
          <p>{state.emptyStateMessage}</p>
        )}

        {state.status === 'success' && featureArticle && (
          <>
            <p className="today-section-label">오늘의 글</p>
            <ArticleCard
              article={featureArticle}
              variant="feature"
              onOpenIntro={() => onOpenArticle(featureArticle.id)}
            />

            {compactArticles.length > 0 && (
              <>
                <p className="today-section-label">이런 글도 있어요</p>
                <div className="today-recommendation-list">
                  {compactArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      variant="compact"
                      onSelect={() => onSelectArticle(article.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer className="today-tabbar">
        <button type="button" className="today-tab today-tab--active">
          <HomeIcon />
          오늘의 깸
        </button>
        <button type="button" className="today-tab" onClick={() => onGoToMyGgaem()}>
          <CalendarIcon />
          나의 깸
        </button>
      </footer>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 11L12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 9h16M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
