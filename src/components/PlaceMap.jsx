import { useEffect, useRef } from 'react'
import { useKakaoLoader } from '../lib/useKakaoLoader.js'
import { colors, radius, styles } from '../styles/theme.js'

// 카카오 좌표 규약: x=경도(lng), y=위도(lat). 카카오맵 LatLng 생성자는 (위도, 경도) 순서라
// 여기서 반드시 x↔lng, y↔lat 로 정확히 매핑해야 한다.

export default function PlaceMap({ myPosition, places }) {
  const { loaded, error: loadError } = useKakaoLoader()
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!loaded || !containerRef.current) return

    const { kakao } = window
    const center = new kakao.maps.LatLng(myPosition.lat, myPosition.lng)
    const map = new kakao.maps.Map(containerRef.current, { center, level: 5 })
    mapRef.current = map

    const bounds = new kakao.maps.LatLngBounds()
    bounds.extend(center)

    const myMarker = new kakao.maps.Marker({
      map,
      position: center,
      image: new kakao.maps.MarkerImage(
        'data:image/svg+xml;base64,' +
          btoa(
            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="10" fill="${colors.primary}" stroke="#fff" stroke-width="3"/></svg>`,
          ),
        new kakao.maps.Size(28, 28),
      ),
    })

    const myInfoWindow = new kakao.maps.InfoWindow({ content: '<div style="padding:4px 8px;font-size:12px;">내 위치</div>' })
    myInfoWindow.open(map, myMarker)

    places.forEach((place) => {
      const position = new kakao.maps.LatLng(Number(place.y), Number(place.x))
      bounds.extend(position)

      const marker = new kakao.maps.Marker({ map, position })
      const infoWindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${place.place_name}</div>`,
      })

      kakao.maps.event.addListener(marker, 'click', () => {
        infoWindow.open(map, marker)
      })
    })

    map.setBounds(bounds)

    const relayoutTimer = setTimeout(() => {
      map.relayout()
      map.setBounds(bounds)
    }, 0)

    return () => clearTimeout(relayoutTimer)
  }, [loaded, myPosition, places])

  if (loadError) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={styles.errorText}>지도를 불러오지 못했습니다: {loadError}</p>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={styles.helperText}>지도를 불러오는 중...</p>
      </div>
    )
  }

  return <div ref={containerRef} style={{ width: '100%', height: 320, borderRadius: radius.lg, overflow: 'hidden' }} />
}
