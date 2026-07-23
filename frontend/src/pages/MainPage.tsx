import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KakaoMap from '../components/KakaoMap'
import SituationSelector from '../components/SituationSelector'
import SearchBar, { type SearchSuggestion } from '../components/SearchBar'
import Sidebar from '../components/Sidebar'
import StoreList from '../components/StoreList'
import { getReviewSummaries } from '../api/reviews'
import { calculateSituationScore } from '../features/recommendation/calculateSituationRecommendation'
import { loadKakaoMaps } from '../lib/kakaoMaps'
import type { Store, StoreCategory } from '../types/store'
import type {
  RecommendationSituation,
  StoreReviewSummary,
} from '../types/recommendation'
import './MainPage.css'

const SEARCH_CENTER = { latitude: 36.6283, longitude: 127.4565 }
const CATEGORY_CODES = ['FD6', 'CE7'] as const

type SearchSession = {
  keyword: string
  center: { latitude: number; longitude: number }
  radiusMeters: number
  nextPage: Record<(typeof CATEGORY_CODES)[number], number>
  hasMore: Record<(typeof CATEGORY_CODES)[number], boolean>
}

function MainPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<'map' | 'situation'>('map')
  const [selectedSituation, setSelectedSituation] =
    useState<RecommendationSituation | null>(null)
  const [draftSituation, setDraftSituation] =
    useState<RecommendationSituation | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [searchCenter, setSearchCenter] = useState(SEARCH_CENTER)
  const [locationLabel, setLocationLabel] = useState('충북대학교')
  const [radiusKm, setRadiusKm] = useState(3)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [reviewSummaries, setReviewSummaries] = useState<
    Record<string, StoreReviewSummary>
  >({})
  const searchSessionRef = useRef<SearchSession | null>(null)
  const isSearchingRef = useRef(false)
  const requestIdRef = useRef(0)
  const isStoreListOpen = hasSearched && activeView === 'map'
  const storeIdsKey = stores.map((store) => store.id).join(',')
  const storesWithReviews = stores
    .map((store) => {
      const summary = reviewSummaries[store.id] ?? createEmptySummary(store.id)
      return {
        ...store,
        rating: summary.rating,
        reviewCount: summary.reviewCount,
        recommendationScore: selectedSituation
          ? calculateSituationScore(selectedSituation, summary)
          : undefined,
        recommendationDataCount: summary.ratingDataCount,
      }
    })
    .sort((a, b) => {
      if (!selectedSituation) return a.distance - b.distance
      return (
        (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0) ||
        (b.recommendationDataCount ?? 0) - (a.recommendationDataCount ?? 0) ||
        a.distance - b.distance
      )
    })
  const recommendedStoreId = selectedSituation
    ? storesWithReviews[0]?.id ?? null
    : null

  useEffect(() => {
    if (!storeIdsKey) return
    let isCancelled = false
    void getReviewSummaries(storeIdsKey.split(','))
      .then((summaries) => {
        if (!isCancelled) {
          setReviewSummaries(
            Object.fromEntries(
              summaries.map((summary) => [summary.kakaoPlaceId, summary]),
            ),
          )
        }
      })
      .catch((reason) => {
        if (!isCancelled) {
          setSearchError(
            reason instanceof Error
              ? reason.message
              : '가게 평가를 불러오지 못했습니다.',
          )
        }
      })
    return () => {
      isCancelled = true
    }
  }, [storeIdsKey])

  const handleSituationButtonClick = () => {
    if (selectedSituation) {
      setSelectedSituation(null)
      setDraftSituation(null)
      setActiveView('map')
      return
    }

    setDraftSituation(null)
    setActiveView('situation')
  }

  const handleSituationSave = () => {
    if (!draftSituation) return
    setSelectedSituation(draftSituation)
    setActiveView('map')
  }

  const handleSearchResultsClose = () => {
    requestIdRef.current += 1
    searchSessionRef.current = null
    isSearchingRef.current = false
    setStores([])
    setReviewSummaries({})
    setSelectedStoreId(null)
    setHasSearched(false)
    setHasMoreResults(false)
    setIsSearching(false)
    setSearchError(null)
  }

  const loadNextPage = useCallback(async () => {
    const session = searchSessionRef.current
    if (!session || isSearchingRef.current) return

    const activeCategories = CATEGORY_CODES.filter((code) => session.hasMore[code])
    if (activeCategories.length === 0) return

    const requestId = requestIdRef.current
    isSearchingRef.current = true
    setIsSearching(true)
    setSearchError(null)

    try {
      await loadKakaoMaps()
      const center = new window.kakao.maps.LatLng(
        session.center.latitude,
        session.center.longitude,
      )
      const places = new window.kakao.maps.services.Places()

      const pages = await Promise.all(
        activeCategories.map((categoryCode) =>
          searchCategoryPage(
            places,
            session.keyword,
            categoryCode,
            session.nextPage[categoryCode],
            center,
            session.radiusMeters,
          ),
        ),
      )

      if (requestId !== requestIdRef.current) return

      pages.forEach(({ categoryCode, hasNextPage }) => {
        session.hasMore[categoryCode] = hasNextPage
        session.nextPage[categoryCode] += 1
      })
      setHasMoreResults(CATEGORY_CODES.some((code) => session.hasMore[code]))

      const newStores = pages.flatMap(({ stores: pageStores }) => pageStores)
      setStores((current) => mergeStoresByDistance(current, newStores))
    } catch (reason: unknown) {
      if (requestId !== requestIdRef.current) return
      setSearchError(
        reason instanceof Error ? reason.message : '가게 검색에 실패했습니다.',
      )
    } finally {
      if (requestId === requestIdRef.current) {
        isSearchingRef.current = false
        setIsSearching(false)
      }
    }
  }, [])

  const startSearch = (
    keyword: string,
    center: { latitude: number; longitude: number } = searchCenter,
  ) => {
    requestIdRef.current += 1
    searchSessionRef.current = {
      keyword,
      center,
      radiusMeters: radiusKm * 1000,
      nextPage: { FD6: 1, CE7: 1 },
      hasMore: { FD6: true, CE7: true },
    }
    setActiveView('map')
    setStores([])
    setReviewSummaries({})
    setSelectedStoreId(null)
    setHasSearched(true)
    setHasMoreResults(true)
    setSearchError(null)
    isSearchingRef.current = false
    setIsSearching(false)
    queueMicrotask(() => void loadNextPage())
  }

  const requestSearchSuggestions = useCallback(async (query: string) => {
    await loadKakaoMaps()
    const results = await findLocations(query)
    return results.map(toSearchSuggestion)
  }, [])

  const handleLocationSelect = (suggestion: SearchSuggestion) => {
    const center = {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }
    setSearchCenter(center)
    setLocationLabel(suggestion.name)
    startSearch('', center)
  }

  const handleCurrentLocation = () =>
    new Promise<void>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저는 현재 위치를 지원하지 않습니다.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const center = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
          setSearchCenter(center)
          setLocationLabel('내 현재 위치')
          setActiveView('map')
          startSearch('', center)
          resolve()
        },
        () => reject(new Error('위치 권한을 허용하거나 직접 위치를 검색해 주세요.')),
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })

  return (
    <div
      className="main-page"
      data-store-list-open={isStoreListOpen || undefined}
    >
      <Sidebar />

      <main className="main-page__content">
        <div className="main-page__primary">
          <header className="main-page__search">
            <SearchBar
              locationLabel={locationLabel}
              radiusKm={radiusKm}
              isSearching={isSearching}
              onSearch={startSearch}
              onRequestSuggestions={requestSearchSuggestions}
              onLocationSelect={handleLocationSelect}
              onCurrentLocation={handleCurrentLocation}
              onRadiusChange={setRadiusKm}
              onSituationClick={handleSituationButtonClick}
              isSituationActive={selectedSituation !== null}
            />
          </header>

          {activeView === 'map' ? (
            <section className="main-page__map" aria-label="지도 영역">
              <KakaoMap
                center={searchCenter}
                stores={storesWithReviews}
                selectedStoreId={selectedStoreId}
                onStoreSelect={setSelectedStoreId}
              />
            </section>
          ) : (
            <div className="main-page__situation">
              <SituationSelector
                selectedSituation={draftSituation}
                onClose={() => {
                  setDraftSituation(null)
                  setActiveView('map')
                }}
                onSelect={setDraftSituation}
                onSave={handleSituationSave}
              />
            </div>
          )}
        </div>

        {isStoreListOpen && (
          <aside
            className="main-page__store-list"
            aria-label="검색된 가게 목록"
          >
            <StoreList
              stores={storesWithReviews}
              recommendedStoreId={recommendedStoreId}
              selectedStoreId={selectedStoreId}
              isLoading={isSearching}
              hasMore={hasMoreResults}
              error={searchError}
              onLoadMore={() => void loadNextPage()}
              onStoreSelect={setSelectedStoreId}
              onClose={handleSearchResultsClose}
              onViewDetail={(store) =>
                navigate(`/stores/${store.id}`, { state: { store } })
              }
            />
          </aside>
        )}
      </main>
    </div>
  )
}

function createEmptySummary(kakaoPlaceId: string): StoreReviewSummary {
  return {
    kakaoPlaceId,
    reviewCount: 0,
    rating: null,
    tasteScore: 50,
    valueScore: 50,
    atmosphereScore: 50,
    quietScore: 50,
    speedScore: 50,
    ratingDataCount: 0,
  }
}

export default MainPage

function searchCategoryPage(
  places: KakaoPlaces,
  keyword: string,
  categoryCode: (typeof CATEGORY_CODES)[number],
  page: number,
  location: KakaoLatLng,
  radiusMeters: number,
) {
  return new Promise<{
    categoryCode: (typeof CATEGORY_CODES)[number]
    stores: Store[]
    hasNextPage: boolean
  }>((resolve, reject) => {
    const callback: KakaoPlacesCallback = (results, status, pagination) => {
        if (status === window.kakao.maps.services.Status.OK) {
          resolve({
            categoryCode,
            stores: results.map((result) => toStore(result, categoryCode)),
            hasNextPage: pagination.hasNextPage,
          })
          return
        }

        if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          resolve({ categoryCode, stores: [], hasNextPage: false })
          return
        }

        reject(new Error('Kakao 장소 검색 중 오류가 발생했습니다.'))
      }
    const options: KakaoPlacesOptions = {
        category_group_code: categoryCode,
        location,
        radius: radiusMeters,
        size: 15,
        page,
        sort: window.kakao.maps.services.SortBy.DISTANCE,
      }
    if (keyword) places.keywordSearch(keyword, callback, options)
    else places.categorySearch(categoryCode, callback, options)
  })
}

function findLocations(query: string) {
  return new Promise<KakaoPlaceResult[]>((resolve, reject) => {
    const places = new window.kakao.maps.services.Places()
    places.keywordSearch(
      query,
      (results, status) => {
        if (status === window.kakao.maps.services.Status.OK && results.length > 0) {
          resolve(results.slice(0, 6))
          return
        }
        reject(new Error('입력한 위치를 찾지 못했습니다.'))
      },
      { size: 6 },
    )
  })
}

function toSearchSuggestion(result: KakaoPlaceResult): SearchSuggestion {
  const isStore = result.category_group_code === 'FD6' || result.category_group_code === 'CE7'
  return {
    id: result.id,
    name: result.place_name,
    address: result.road_address_name || result.address_name,
    category: result.category_name,
    kind: isStore ? 'store' : 'location',
    latitude: Number(result.y),
    longitude: Number(result.x),
  }
}

function toStore(
  result: KakaoPlaceResult,
  categoryCode: (typeof CATEGORY_CODES)[number],
): Store {
  const category: StoreCategory = categoryCode === 'FD6' ? '음식점' : '카페'

  return {
    id: result.id,
    name: result.place_name,
    category,
    categoryName: result.category_name,
    phone: result.phone,
    address: result.address_name,
    roadAddress: result.road_address_name,
    longitude: Number(result.x),
    latitude: Number(result.y),
    distance: Number(result.distance),
    placeUrl: result.place_url,
    rating: null,
    reviewCount: 0,
  }
}

function mergeStoresByDistance(current: Store[], incoming: Store[]) {
  const storesById = new Map(current.map((store) => [store.id, store]))
  incoming.forEach((store) => storesById.set(store.id, store))
  return [...storesById.values()].sort((a, b) => a.distance - b.distance)
}
