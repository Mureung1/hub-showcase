import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createReview, getReviews, toggleReviewLike } from '../api/reviews'
import ReviewCard from '../components/ReviewCard'
import ReviewForm from '../components/ReviewForm'
import SearchBar from '../components/SearchBar'
import Sidebar from '../components/Sidebar'
import type { Review } from '../types/review'
import type { CreateReviewInput } from '../features/reviews/reviewRepository'
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
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(true)
  const [reviewsError, setReviewsError] = useState('')
  const [likeError, setLikeError] = useState('')
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set())
  const waitingTimes = reviews.flatMap((review) =>
    review.waitingMinutes === null ? [] : [review.waitingMinutes],
  )
  const averageWaitingMinutes =
    waitingTimes.length > 0
      ? Math.round(
          waitingTimes.reduce((sum, minutes) => sum + minutes, 0) /
            waitingTimes.length,
        )
      : null
  const reviewsWithMineFirst = [...reviews].sort(compareReviewsWithMineFirst)
  const matchedReviews = [...reviews].sort(compareMatchedReviews)
  const featuredReviewId = reviewsWithMineFirst.find((review) => !review.isMine)?.id
  const featuredMatchedReviewId = matchedReviews.find((review) => !review.isMine)?.id

  useEffect(() => {
    if (!storeId) return
    let isCancelled = false

    void getReviews(storeId)
      .then((data) => {
        if (!isCancelled) setReviews(data)
      })
      .catch((reason) => {
        if (!isCancelled) {
          setReviewsError(
            reason instanceof Error ? reason.message : '리뷰를 불러오지 못했습니다.',
          )
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingReviews(false)
      })

    return () => {
      isCancelled = true
    }
  }, [storeId])

  const handleReviewSubmit = async (input: CreateReviewInput) => {
    const savedReview = await createReview(input, store!)
    setReviews((current) => [savedReview, ...current])
    setActiveTab('reviews')
  }

  const handleReviewLike = async (reviewId: string) => {
    setLikeError('')
    setPendingLikeIds((current) => new Set(current).add(reviewId))
    try {
      const result = await toggleReviewLike(reviewId)
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                likedByMe: result.liked,
                likeCount: result.likeCount,
              }
            : review,
        ),
      )
    } catch (reason) {
      setLikeError(
        reason instanceof Error ? reason.message : '리뷰 공감 처리에 실패했습니다.',
      )
    } finally {
      setPendingLikeIds((current) => {
        const next = new Set(current)
        next.delete(reviewId)
        return next
      })
    }
  }

  if (!store || store.id !== storeId) {
    return (
      <div className="store-detail-page">
        <Sidebar />
        <main className="store-detail-page__missing">
          <h1>가게 정보를 불러올 수 없습니다.</h1>
          <button type="button" onClick={() => navigate('/app')}>지도로 돌아가기</button>
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
            <p>
              {isLoadingReviews
                ? '평균 웨이팅 계산 중...'
                : averageWaitingMinutes === null
                  ? '평균 웨이팅 정보 없음'
                  : `평균 웨이팅 ${averageWaitingMinutes}분`}
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
          {likeError && <p role="alert">{likeError}</p>}
          {activeTab === 'reviews' && isLoadingReviews && <p>리뷰를 불러오는 중...</p>}
          {activeTab === 'reviews' && reviewsError && <p role="alert">{reviewsError}</p>}
          {activeTab === 'reviews' && !isLoadingReviews && !reviewsError && (reviews.length === 0 ? (
            <p>아직 등록된 리뷰가 없습니다.</p>
          ) : (
            <div className="store-detail-page__reviews">
              {reviewsWithMineFirst.map((review, index) => (
                <ReviewCard
                  review={review}
                  key={review.id}
                  isFeatured={review.id === featuredReviewId}
                  separateAfter={shouldSeparateAfter(reviewsWithMineFirst, index)}
                  isLikePending={pendingLikeIds.has(review.id)}
                  onLike={handleReviewLike}
                />
              ))}
            </div>
          ))}

          {activeTab === 'matchedReviews' && isLoadingReviews && (
            <p>맞춤 리뷰를 불러오는 중...</p>
          )}
          {activeTab === 'matchedReviews' && reviewsError && (
            <p role="alert">{reviewsError}</p>
          )}
          {activeTab === 'matchedReviews' && !isLoadingReviews && !reviewsError && (
            matchedReviews.length === 0 ? (
              <p>아직 등록된 리뷰가 없습니다.</p>
            ) : (
              <div className="store-detail-page__reviews">
                {matchedReviews.map((review, index) => (
                  <ReviewCard
                    review={review}
                    key={review.id}
                    showTasteMatch
                    isFeatured={review.id === featuredMatchedReviewId}
                    separateAfter={shouldSeparateAfter(matchedReviews, index)}
                    isLikePending={pendingLikeIds.has(review.id)}
                    onLike={handleReviewLike}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'write' && (
            <ReviewForm kakaoPlaceId={store.id} onSubmit={handleReviewSubmit} />
          )}
        </section>
      </main>
    </div>
  )
}

function compareReviewsWithMineFirst(left: Review, right: Review) {
  if (left.isMine !== right.isMine) return left.isMine ? -1 : 1
  return (
    right.likeCount - left.likeCount ||
    Date.parse(right.createdAt) - Date.parse(left.createdAt)
  )
}

function compareMatchedReviews(left: Review, right: Review) {
  if (left.isMine !== right.isMine) return left.isMine ? -1 : 1

  const leftHasMatch = left.tasteMatchPercent !== undefined
  const rightHasMatch = right.tasteMatchPercent !== undefined
  if (leftHasMatch !== rightHasMatch) return leftHasMatch ? -1 : 1

  const matchDifference =
    (right.tasteMatchPercent ?? 0) - (left.tasteMatchPercent ?? 0)
  return (
    matchDifference ||
    right.likeCount - left.likeCount ||
    Date.parse(right.createdAt) - Date.parse(left.createdAt)
  )
}

function shouldSeparateAfter(reviews: Review[], index: number) {
  return Boolean(
    reviews[index]?.isMine &&
    (index === reviews.length - 1 || !reviews[index + 1]?.isMine),
  )
}

export default StoreDetailPage
