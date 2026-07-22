import { useState, type FormEvent } from 'react'
import './SearchBar.css'

export type SearchSuggestion = {
  id: string
  name: string
  address: string
  category: string
  kind: 'location' | 'store'
  latitude: number
  longitude: number
}

type SearchBarProps = {
  initialValue?: string
  placeholder?: string
  locationLabel?: string
  radiusKm?: number
  isSearching?: boolean
  onSearch?: (keyword: string) => void
  onRequestSuggestions?: (query: string) => Promise<SearchSuggestion[]>
  onLocationSelect?: (suggestion: SearchSuggestion) => void
  onCurrentLocation?: () => Promise<void>
  onRadiusChange?: (radiusKm: number) => void
  onSituationClick?: () => void
  isSituationActive?: boolean
}

const RADIUS_OPTIONS = [1, 3, 5, 10] as const

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="m15.5 15.5 4 4" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  )
}

function SearchBar({
  initialValue = '',
  placeholder = '지역, 주소, 가게 또는 메뉴를 검색해 보세요',
  locationLabel,
  radiusKm = 3,
  isSearching = false,
  onSearch,
  onRequestSuggestions,
  onLocationSelect,
  onCurrentLocation,
  onRadiusChange,
  onSituationClick,
  isSituationActive = false,
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialValue)
  const [error, setError] = useState('')

  const chooseLocation = (suggestion: SearchSuggestion) => {
    setKeyword('')
    onLocationSelect?.(suggestion)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = keyword.trim()
    if (!query) return

    let currentSuggestions: SearchSuggestion[] = []
    if (onRequestSuggestions) {
      try {
        currentSuggestions = await onRequestSuggestions(query)
      } catch {
        currentSuggestions = []
      }
    }

    const location = currentSuggestions.find((suggestion) => suggestion.kind === 'location')
    if (location) {
      chooseLocation(location)
      return
    }

    onSearch?.(query)
  }

  const handleCurrentLocation = async () => {
    if (!onCurrentLocation) return
    setError('')
    try {
      await onCurrentLocation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '현재 위치를 확인하지 못했습니다.')
    }
  }

  return (
    <div className="search-panel">
      <form className="search-bar" role="search" onSubmit={(event) => void handleSubmit(event)}>
        <div className="search-bar__field-wrap">
          <label className="search-bar__field">
            <span className="search-bar__icon"><SearchIcon /></span>
            <span className="search-bar__label">지역 또는 가게 검색</span>
            <input
              className="search-bar__input"
              type="search"
              value={keyword}
              placeholder={placeholder}
              autoComplete="off"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
        </div>

        <button className="search-bar__submit" type="submit" disabled={isSearching}>
          검색
        </button>
        {onSituationClick && (
          <button
            className={`search-bar__situation${isSituationActive ? ' search-bar__situation--active' : ''}`}
            type="button"
            aria-pressed={isSituationActive}
            onClick={onSituationClick}
          >
            상황추천
          </button>
        )}
      </form>

      {locationLabel && (
        <div className="search-panel__context">
          <span className="search-panel__location"><PinIcon /> 기준 위치 <strong>{locationLabel}</strong></span>
          {onCurrentLocation && (
            <button type="button" onClick={() => void handleCurrentLocation()}>현재 위치</button>
          )}
          {onRadiusChange && (
            <label>
              <span>반경</span>
              <select value={radiusKm} onChange={(event) => onRadiusChange(Number(event.target.value))}>
                {RADIUS_OPTIONS.map((radius) => <option key={radius} value={radius}>{radius}km</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {error && <p className="search-panel__error" role="alert">{error}</p>}
    </div>
  )
}

export default SearchBar
