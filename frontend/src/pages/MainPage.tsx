import Sidebar from '../components/Sidebar'
import './MainPage.css'

type MainPageProps = {
  showStoreList?: boolean
}

function MainPage({ showStoreList = false }: MainPageProps) {
  return (
    <div
      className="main-page"
      data-store-list-open={showStoreList || undefined}
    >
      <Sidebar />

      <main className="main-page__content">
        <header className="main-page__search" aria-label="가게 검색 영역" />

        <div className="main-page__workspace">
          <section className="main-page__map" aria-label="지도 영역" />

          {showStoreList && (
            <aside
              className="main-page__store-list"
              aria-label="검색된 가게 목록"
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default MainPage
