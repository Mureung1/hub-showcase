import ArticleCard from '../components/ArticleCard'
import type { TodayArticle } from '../api/types'
import './Today.css'

export type TodayState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; items: TodayArticle[]; emptyStateMessage: string | null }

type TodayProps = {
  state: TodayState
}

function formatToday(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export default function Today({ state }: TodayProps) {
  const today = formatToday(new Date())

  return (
    <div className="app-shell">
      <header className="screen-header">
        <h1>오늘의 깸</h1>
        <button className="icon-btn" type="button" aria-label="설정">
          <SettingsIcon />
        </button>
      </header>

      <main className="screen-main">
        <p className="today-date">
          <BookIcon />
          {today} · 오늘의 글
        </p>

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

        {state.status === 'success' && state.items.length > 0 && (
          <>
            <ArticleCard article={state.items[0]} variant="feature" />

            {state.items.length > 1 && (
              <>
                <p className="today-section-label">이런 글도 있어요</p>
                <div className="today-more-list">
                  {state.items.slice(1).map((article) => (
                    <ArticleCard key={article.id} article={article} variant="compact" />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer className="screen-footer">
        <nav className="bottom-tabbar">
          <button type="button" className="bottom-tab bottom-tab--active">
            <BookIcon />
            오늘의 글
          </button>
          {/* 나의 깸 화면은 아직 없다. 만들면 disabled를 뺀다. */}
          <button type="button" className="bottom-tab" disabled>
            <LogIcon />
            나의 깸
          </button>
        </nav>
      </footer>
    </div>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 6.5c3-1.5 6-1.5 8 0 2-1.5 5-1.5 8 0v12c-3-1.5-6-1.5-8 0-2-1.5-5-1.5-8 0v-12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 4v16M5 8h4M5 12h4M5 16h4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
