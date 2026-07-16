import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ReviewCard from '../components/ReviewCard'
import ReviewForm from '../components/ReviewForm'
import SearchBar from '../components/SearchBar'
import Sidebar from '../components/Sidebar'
import type { Review } from '../types/review'
import {
  localReviewRepository,
  type CreateReviewInput,
} from '../features/reviews/reviewRepository'
import type { Store } from '../types/store'
import './StoreDetailPage.css'

type StoreDetailLocationState = {
  store?: Store
}

type DetailTab = 'reviews' | 'matchedReviews' | 'write'

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
  const [activeTab, setActiveTab] = useState<DetailTab>('reviews')
  const [reviews, setReviews] = useState<Review[]>(() =>
    storeId ? localReviewRepository.getByStoreId(storeId) : [],
  )

  const handleReviewSubmit = (input: CreateReviewInput) => {
    localReviewRepository.create(input)
    setReviews(localReviewRepository.getByStoreId(input.kakaoPlaceId))
    setActiveTab('reviews')
  }

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
              {reviews.length === 0
                ? '평점 없음'
                : `★ ${(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)}`}
              {' · '}리뷰 {reviews.length}개
            </p>
            <p>{store.roadAddress || store.address}</p>
            {store.phone && <p>{store.phone}</p>}
          </div>
        </section>

        <nav className="store-detail-page__tabs" aria-label="가게 상세 메뉴">
          <button
            className={`store-detail-page__tab${activeTab === 'reviews' ? ' store-detail-page__tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('reviews')}
          >
            리뷰
          </button>
          <button
            className={`store-detail-page__tab${activeTab === 'matchedReviews' ? ' store-detail-page__tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('matchedReviews')}
          >
            맞춤 리뷰
          </button>
          <button
            className={`store-detail-page__tab${activeTab === 'write' ? ' store-detail-page__tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('write')}
          >
            리뷰 작성
          </button>
        </nav>

        <section className="store-detail-page__panel" aria-live="polite">
          {activeTab === 'reviews' && (reviews.length === 0 ? (
            <p>아직 등록된 리뷰가 없습니다.</p>
          ) : (
            <div className="store-detail-page__reviews">
              {reviews.map((review) => (
                <ReviewCard review={review} key={review.id} />
              ))}
            </div>
          ))}

          {activeTab === 'matchedReviews' && (
            <p>취향 유사도 기능을 준비하고 있습니다.</p>
          )}

          {activeTab === 'write' && (
            <ReviewForm kakaoPlaceId={store.id} onSubmit={handleReviewSubmit} />
          )}
        </section>
      </main>
    </div>
  )
}

export default StoreDetailPage
