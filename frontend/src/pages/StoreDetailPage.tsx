import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ReviewCard from '../components/ReviewCard'
import SearchBar from '../components/SearchBar'
import Sidebar from '../components/Sidebar'
import type { Review } from '../types/review'
import type { Store } from '../types/store'
import './StoreDetailPage.css'

type StoreDetailLocationState = {
  store?: Store
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m15 5-7 7 7 7" />
    </svg>
  )
}

function StoreDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { storeId } = useParams()
  const store = (location.state as StoreDetailLocationState | null)?.store
  const reviews: Review[] = []

  if (!store || store.id !== storeId) {
    return (
      <div className="store-detail-page">
        <Sidebar />
        <main className="store-detail-page__missing">
          <h1>가게 정보를 불러올 수 없습니다.</h1>
          <button type="button" onClick={() => navigate('/')}>지도로 돌아가기</button>
        </main>
      </div>
    )
  }

  return (
    <div className="store-detail-page">
      <Sidebar />

      <main className="store-detail-page__main">
        <header className="store-detail-page__toolbar">
          <button
            className="store-detail-page__back"
            type="button"
            aria-label="검색 결과로 돌아가기"
            onClick={() => navigate(-1)}
          >
            <BackIcon />
          </button>
          <SearchBar />
        </header>

        <section className="store-detail-page__store" aria-labelledby="store-name">
          <div className="store-detail-page__image" aria-label="가게 이미지 영역">
            이미지 준비 중
          </div>
          <div className="store-detail-page__store-copy">
            <span>{store.category} · {store.categoryName.split(' > ').at(-1)}</span>
            <h1 id="store-name">{store.name}</h1>
            <p className="store-detail-page__rating">
              {store.rating === null ? '평점 없음' : `★ ${store.rating.toFixed(1)}`}
              {' · '}리뷰 {store.reviewCount}개
            </p>
            <p>{store.roadAddress || store.address}</p>
            {store.phone && <p>{store.phone}</p>}
          </div>
        </section>

        <nav className="store-detail-page__tabs" aria-label="가게 상세 메뉴">
          <button className="store-detail-page__tab store-detail-page__tab--active" type="button">
            리뷰
          </button>
          <button className="store-detail-page__tab" type="button">맞춤 리뷰</button>
          <button className="store-detail-page__tab" type="button">리뷰 작성</button>
        </nav>

        <section className="store-detail-page__panel" aria-label="리뷰 목록 영역">
          {reviews.length === 0 ? (
            <p>아직 등록된 리뷰가 없습니다.</p>
          ) : (
            <div className="store-detail-page__reviews">
              {reviews.map((review) => (
                <ReviewCard review={review} key={review.id} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default StoreDetailPage
