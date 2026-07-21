import { useState, type FormEvent } from 'react'
import './LocationControls.css'

type LocationControlsProps = {
  locationLabel: string
  radiusKm: number
  isSearching: boolean
  onLocationSearch: (query: string) => Promise<void>
  onCurrentLocation: () => Promise<void>
  onRadiusChange: (radiusKm: number) => void
  onNearbySearch: () => void
}

const RADIUS_OPTIONS = [1, 3, 5, 10] as const

function LocationControls({
  locationLabel,
  radiusKm,
  isSearching,
  onLocationSearch,
  onCurrentLocation,
  onRadiusChange,
  onNearbySearch,
}: LocationControlsProps) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const handleLocationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!query.trim()) return
    setError('')
    try {
      await onLocationSearch(query.trim())
      setQuery('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '위치를 찾지 못했습니다.')
    }
  }

  const handleCurrentLocation = async () => {
    setError('')
    try {
      await onCurrentLocation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '현재 위치를 확인하지 못했습니다.')
    }
  }

  return (
    <div className="location-controls">
      <form className="location-controls__search" onSubmit={handleLocationSubmit}>
        <label>
          <span>기준 위치</span>
          <input
            value={query}
            placeholder={locationLabel}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button type="submit">위치 설정</button>
      </form>

      <button type="button" onClick={() => void handleCurrentLocation()}>
        현재 위치
      </button>

      <label className="location-controls__radius">
        <span>반경</span>
        <select
          value={radiusKm}
          onChange={(event) => onRadiusChange(Number(event.target.value))}
        >
          {RADIUS_OPTIONS.map((radius) => (
            <option key={radius} value={radius}>{radius}km</option>
          ))}
        </select>
      </label>

      <button
        className="location-controls__nearby"
        type="button"
        disabled={isSearching}
        onClick={onNearbySearch}
      >
        이 위치 주변 추천
      </button>

      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export default LocationControls
