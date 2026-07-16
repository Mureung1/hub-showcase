import { useEffect, useRef, useState } from 'react'
import { hasKakaoMapKey, loadKakaoMaps } from '../lib/kakaoMaps'
import type { Store } from '../types/store'
import './KakaoMap.css'

const CHUNGBUK_NATIONAL_UNIVERSITY = {
  latitude: 36.6283,
  longitude: 127.4565,
}

type KakaoMapProps = {
  stores?: Store[]
  selectedStoreId?: string | null
  onStoreSelect?: (storeId: string) => void
}

function KakaoMap({
  stores = [],
  selectedStoreId = null,
  onStoreSelect,
}: KakaoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMapInstance | null>(null)
  const markersRef = useRef(new Map<string, KakaoMarker>())
  const infoWindowRef = useRef<ReturnType<typeof createInfoWindow> | null>(null)
  const [error, setError] = useState<string | null>(() =>
    hasKakaoMapKey ? null : 'Kakao Maps 키가 설정되지 않았습니다.',
  )

  useEffect(() => {
    const container = mapContainerRef.current

    if (!container || !hasKakaoMapKey) return

    let isActive = true

    loadKakaoMaps()
      .then(() => {
        if (!isActive || !mapContainerRef.current) return

        const center = new window.kakao.maps.LatLng(
          CHUNGBUK_NATIONAL_UNIVERSITY.latitude,
          CHUNGBUK_NATIONAL_UNIVERSITY.longitude,
        )

        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
          center,
          level: 4,
        })
      })
      .catch((reason: unknown) => {
        if (!isActive) return
        setError(
          reason instanceof Error
            ? reason.message
            : '지도를 불러오는 중 오류가 발생했습니다.',
        )
      })

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !window.kakao?.maps) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current.clear()
    infoWindowRef.current?.close()

    if (stores.length === 0) return

    const bounds = new window.kakao.maps.LatLngBounds()

    stores.forEach((store) => {
      const position = new window.kakao.maps.LatLng(
        store.latitude,
        store.longitude,
      )
      const marker = new window.kakao.maps.Marker({
        map,
        position,
        title: store.name,
      })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        onStoreSelect?.(store.id)
      })

      markersRef.current.set(store.id, marker)
      bounds.extend(position)
    })

    map.setBounds(bounds)
  }, [onStoreSelect, stores])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedStoreId) {
      infoWindowRef.current?.close()
      return
    }

    const store = stores.find((item) => item.id === selectedStoreId)
    const marker = markersRef.current.get(selectedStoreId)
    if (!store || !marker) return

    const position = new window.kakao.maps.LatLng(store.latitude, store.longitude)
    map.panTo(position)

    if (!infoWindowRef.current) {
      infoWindowRef.current = createInfoWindow()
    }

    infoWindowRef.current.setContent(
      `<div style="padding:8px 12px;white-space:nowrap;font-size:13px;font-weight:700;color:#28251f">${escapeHtml(store.name)}</div>`,
    )
    infoWindowRef.current.open(map, marker)
  }, [selectedStoreId, stores])

  return (
    <div className="kakao-map">
      <div
        ref={mapContainerRef}
        className="kakao-map__canvas"
        aria-label="충북대학교 주변 지도"
      />

      {!error && <div className="kakao-map__loading">지도를 불러오는 중...</div>}

      {error && (
        <div className="kakao-map__error" role="alert">
          <strong>지도를 표시할 수 없습니다.</strong>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function createInfoWindow() {
  return new window.kakao.maps.InfoWindow()
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character]
  })
}

export default KakaoMap
