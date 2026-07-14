import ArticleCard, { type Article } from '../components/ArticleCard'
import './Today.css'

// API 연결 전까지 쓰는 임시 데이터.
const FEATURED_ARTICLE: Article = {
  id: '1',
  title: '숏폼 시대, 우리는 정말 더 많이 이해하고 있을까',
  sourceName: '요즘IT',
  contentTypeLabel: '칼럼',
  interestName: 'IT·개발',
  officialExcerpt:
    '틱톡과 릴스 같은 숏폼 콘텐츠는 15초 안에 결론부터 보여주도록 설계되어 있다. 덕분에 우리는 어떤 정보든 빠르게 훑을 수 있게 됐지만, 끝까지 읽지 않아도 다 안 것 같은 착각도 함께 커진다.',
  readingTimeMinutes: 4,
}

const MORE_ARTICLES: Article[] = [
  {
    id: '2',
    title: '주니어가 AI에게 일을 맡길 때 잃는 것',
    sourceName: '폴인',
    contentTypeLabel: '뉴스레터',
    interestName: '커리어·취업',
    officialExcerpt: '',
    readingTimeMinutes: 5,
  },
  {
    id: '3',
    title: '이해하지 않고도 이해한 척하는 법',
    sourceName: '브런치',
    contentTypeLabel: '에세이',
    interestName: '심리',
    officialExcerpt: '',
    readingTimeMinutes: 3,
  },
]

function formatToday(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export default function Today() {
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

        <ArticleCard article={FEATURED_ARTICLE} variant="feature" />

        <p className="today-section-label">이런 글도 있어요</p>
        <div className="today-more-list">
          {MORE_ARTICLES.map((article) => (
            <ArticleCard key={article.id} article={article} variant="compact" />
          ))}
        </div>
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
