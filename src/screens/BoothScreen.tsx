import { ChevronRight, Search } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { FilterChips } from '../components/FilterChips'
import { ScreenHeader } from '../components/ScreenHeader'
import { SegmentedControl } from '../components/SegmentedControl'
import { boothCategories, dates } from '../data/festivalData'
import type { Booth } from '../types/festival'

type BoothScreenProps = {
  booth: Booth | null
  booths: Booth[]
  category: string
  date: string
  query: string
  onBack: () => void
  onCategoryChange: (category: string) => void
  onDateChange: (date: string) => void
  onQueryChange: (query: string) => void
  onSelectBooth: (booth: Booth) => void
}

export function BoothScreen({
  booth,
  booths,
  category,
  date,
  query,
  onBack,
  onCategoryChange,
  onDateChange,
  onQueryChange,
  onSelectBooth,
}: BoothScreenProps) {
  if (booth) {
    return <BoothDetail booth={booth} onBack={onBack} />
  }

  return (
    <section className="screen" aria-labelledby="booth-list-title">
      <ScreenHeader
        description="부스 위치, 운영 시간, 메뉴와 가격을 확인하세요."
        title="부스"
      />
      <SegmentedControl
        label="날짜 선택"
        options={dates}
        value={date}
        onChange={onDateChange}
      />
      <label className="search-field">
        <Search aria-hidden="true" size={20} />
        <span className="sr-only">부스 검색</span>
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="부스명 또는 메뉴 검색"
          type="search"
          value={query}
        />
      </label>
      <FilterChips
        label="부스 카테고리"
        options={boothCategories}
        value={category}
        onChange={onCategoryChange}
      />
      <section className="map-summary" aria-label="배치도 요약">
        <div className="map-summary-header">
          <div>
            <h3>오늘의 배치도</h3>
            <p>임시 지도 · 실제 배치도 이미지 교체 예정</p>
          </div>
          <span>5.16</span>
        </div>
        <div className="map-placeholder" aria-hidden="true">
          <span className="map-zone zone-a">A 음식</span>
          <span className="map-zone zone-b">B 체험</span>
          <span className="map-zone zone-c">C 굿즈</span>
          <span className="map-stage">중앙무대</span>
        </div>
      </section>
      <div className="row-list">
        {booths.length > 0 ? (
          booths.map((item) => (
            <button
              className="booth-row"
              key={item.id}
              onClick={() => onSelectBooth(item)}
              type="button"
            >
              <div>
                <span className="tag">{item.category}</span>
                <h3>{item.name}</h3>
                <p>
                  {item.location} · {item.hours}
                </p>
                <p>{item.menu.slice(0, 2).join(', ')}</p>
              </div>
              <ChevronRight aria-hidden="true" size={22} />
            </button>
          ))
        ) : (
          <EmptyState text="검색 조건에 맞는 부스가 없습니다." />
        )}
      </div>
    </section>
  )
}

function BoothDetail({
  booth,
  onBack,
}: {
  booth: Booth
  onBack: () => void
}) {
  return (
    <section className="screen detail-screen" aria-labelledby="booth-title">
      <button className="back-button" onClick={onBack} type="button">
        이전
      </button>
      <span className="tag">{booth.category}</span>
      <h2 id="booth-title">{booth.name}</h2>
      <dl className="detail-meta">
        <div>
          <dt>위치</dt>
          <dd>{booth.location}</dd>
        </div>
        <div>
          <dt>운영 시간</dt>
          <dd>{booth.hours}</dd>
        </div>
      </dl>
      <section className="menu-panel" aria-labelledby="menu-title">
        <h3 id="menu-title">메뉴와 가격</h3>
        {booth.menu.map((menu, index) => (
          <div className="menu-row" key={menu}>
            <span>{menu}</span>
            <strong>{booth.prices[index]}</strong>
          </div>
        ))}
      </section>
    </section>
  )
}
