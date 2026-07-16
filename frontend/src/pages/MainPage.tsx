import { useCallback, useRef, useState } from 'react'
import KakaoMap from '../components/KakaoMap'
import PrioritySelector, {
  type PriorityOption,
} from '../components/PrioritySelector'
import SearchBar from '../components/SearchBar'
import Sidebar from '../components/Sidebar'
import StoreList from '../components/StoreList'
import { loadKakaoMaps } from '../lib/kakaoMaps'
import type { Store, StoreCategory } from '../types/store'
import './MainPage.css'

const SEARCH_CENTER = { latitude: 36.6283, longitude: 127.4565 }
const CATEGORY_CODES = ['FD6', 'CE7'] as const

type SearchSession = {
  keyword: string
  nextPage: Record<(typeof CATEGORY_CODES)[number], number>
  hasMore: Record<(typeof CATEGORY_CODES)[number], boolean>
}

function MainPage() {
  const [activeView, setActiveView] = useState<'map' | 'priority'>('map')
  const [savedPriorities, setSavedPriorities] = useState<PriorityOption[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchSessionRef = useRef<SearchSession | null>(null)
  const isSearchingRef = useRef(false)
  const requestIdRef = useRef(0)
  const isStoreListOpen = hasSearched && activeView === 'map'

  const handleApplyPriorities = (priorities: PriorityOption[]) => {
    setSavedPriorities(priorities)
    setActiveView('map')
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
        SEARCH_CENTER.latitude,
        SEARCH_CENTER.longitude,
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

  const handleSearch = (keyword: string) => {
    requestIdRef.current += 1
    searchSessionRef.current = {
      keyword,
      nextPage: { FD6: 1, CE7: 1 },
      hasMore: { FD6: true, CE7: true },
    }
    setActiveView('map')
    setStores([])
    setSelectedStoreId(null)
    setHasSearched(true)
    setHasMoreResults(true)
    setSearchError(null)
    isSearchingRef.current = false
    setIsSearching(false)
    queueMicrotask(() => void loadNextPage())
  }

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
              onSearch={handleSearch}
              onPriorityClick={() => setActiveView('priority')}
            />
          </header>

          {activeView === 'map' ? (
            <section className="main-page__map" aria-label="지도 영역">
              <KakaoMap
                stores={stores}
                selectedStoreId={selectedStoreId}
                onStoreSelect={setSelectedStoreId}
              />
            </section>
          ) : (
            <div className="main-page__priority">
              <PrioritySelector
                initialPriorities={savedPriorities}
                onClose={() => setActiveView('map')}
                onApply={handleApplyPriorities}
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
              stores={stores}
              selectedStoreId={selectedStoreId}
              isLoading={isSearching}
              hasMore={hasMoreResults}
              error={searchError}
              onLoadMore={() => void loadNextPage()}
              onStoreSelect={setSelectedStoreId}
            />
          </aside>
        )}
      </main>
    </div>
  )
}

export default MainPage

function searchCategoryPage(
  places: KakaoPlaces,
  keyword: string,
  categoryCode: (typeof CATEGORY_CODES)[number],
  page: number,
  location: KakaoLatLng,
) {
  return new Promise<{
    categoryCode: (typeof CATEGORY_CODES)[number]
    stores: Store[]
    hasNextPage: boolean
  }>((resolve, reject) => {
    places.keywordSearch(
      keyword,
      (results, status, pagination) => {
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
      },
      {
        category_group_code: categoryCode,
        location,
        radius: 5000,
        size: 15,
        page,
        sort: window.kakao.maps.services.SortBy.DISTANCE,
      },
    )
  })
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
