import { useState } from 'react'
import PrioritySelector, {
  type PriorityOption,
} from '../components/PrioritySelector'
import SearchBar from '../components/SearchBar'
import Sidebar from '../components/Sidebar'
import './MainPage.css'

type MainPageProps = {
  showStoreList?: boolean
}

function MainPage({ showStoreList = false }: MainPageProps) {
  const [activeView, setActiveView] = useState<'map' | 'priority'>('map')
  const [savedPriorities, setSavedPriorities] = useState<PriorityOption[]>([])
  const isStoreListOpen = showStoreList && activeView === 'map'

  const handleApplyPriorities = (priorities: PriorityOption[]) => {
    setSavedPriorities(priorities)
    setActiveView('map')
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
              onSearch={() => setActiveView('map')}
              onPriorityClick={() => setActiveView('priority')}
            />
          </header>

          {activeView === 'map' ? (
            <section className="main-page__map" aria-label="지도 영역" />
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
          />
        )}
      </main>
    </div>
  )
}

export default MainPage
