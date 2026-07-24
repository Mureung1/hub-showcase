import ArticleCard from './components/ArticleCard'
import type { TodayArticle } from '../../api/types'
import mascotMy from '../../assets/mascot/mascot-my.png'
import BottomTabBar from '../../shared/ui/BottomTabBar/BottomTabBar'
import ErrorState from '../../shared/ui/ErrorState/ErrorState'
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
          <ErrorState message={state.message} onRetry={state.onRetry} />
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

      <BottomTabBar
        activeTab="today"
        onChange={(tab) => {
          if (tab === 'myGgaem') onGoToMyGgaem()
        }}
      />
    </div>
  )
}
