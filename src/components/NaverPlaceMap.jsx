import { useEffect, useRef } from 'react'
import { useNaverMapLoader } from '../lib/useNaverMapLoader.js'
import { colors, radius, styles } from '../styles/theme.js'

// 기존 PlaceMap(카카오)의 네이버 버전. 카카오 쪽은 롤백용으로 그대로 둔다.
//
// 좌표 규약: 식당 데이터(searchPlaces)는 여전히 카카오 로컬 검색 결과라 x=경도(lng), y=위도(lat)로
// 들어온다. 네이버 LatLng 생성자는 (위도, 경도) 순서이므로, 반드시 y→위도, x→경도로 매핑해야 한다.
// 순서를 바꾸면 마커가 엉뚱한 곳(바다 등)에 찍힌다.

export default function NaverPlaceMap({ myPosition, places = [] }) {
  const { loaded, error: loadError } = useNaverMapLoader()
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!loaded || !containerRef.current) return

    const { naver } = window
    const center = new naver.maps.LatLng(myPosition.lat, myPosition.lng)
    const map = new naver.maps.Map(containerRef.current, { center, zoom: 15 })
    mapRef.current = map

    const bounds = new naver.maps.LatLngBounds(center, center)

    // 내 위치는 식당 마커(기본 빨간 핀)와 구분되도록 포인트 컬러의 원형 아이콘을 쓴다.
    const myMarker = new naver.maps.Marker({
      map,
      position: center,
      icon: {
        content: `<div style="width:16px;height:16px;border-radius:50%;background:${colors.primary};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
        size: new naver.maps.Size(22, 22),
        anchor: new naver.maps.Point(11, 11),
      },
    })
    const myInfoWindow = new naver.maps.InfoWindow({
      content: '<div style="padding:4px 8px;font-size:12px;">내 위치</div>',
    })
    myInfoWindow.open(map, myMarker)

    places.forEach((place) => {
      const position = new naver.maps.LatLng(Number(place.y), Number(place.x))
      bounds.extend(position)

      const marker = new naver.maps.Marker({ map, position })
      const infoWindow = new naver.maps.InfoWindow({
        content: `<div style="padding:4px 8px;font-size:12px;white-space:nowrap;">${place.place_name}</div>`,
      })

      naver.maps.Event.addListener(marker, 'click', () => {
        infoWindow.open(map, marker)
      })
    })

    // 장소가 없을 때(내 위치 핀만)는 fitBounds가 최대 줌으로 조여버리므로 중심만 잡는다.
    if (places.length > 0) {
      map.fitBounds(bounds)
    }

    // 컨테이너가 처음 그려질 때 아직 레이아웃 크기가 확정되지 않아 지도가 깨져 보이는 경우가 있어,
    // 다음 틱에 리사이즈 이벤트를 한 번 더 쏴서 바로잡는다.
    const relayoutTimer = setTimeout(() => {
      naver.maps.Event.trigger(map, 'resize')
      if (places.length > 0) {
        map.fitBounds(bounds)
      } else {
        map.setCenter(center)
      }
    }, 0)

    return () => clearTimeout(relayoutTimer)
  }, [loaded, myPosition, places])

  // 탭/아코디언 등으로 지도 컨테이너가 숨겨졌다(display:none 등) 나중에 다시 보이는 경우, 네이버 지도는
  // 스스로 크기 변화를 감지하지 못해 레이아웃이 깨진 채로 남을 수 있다 — 컨테이너 크기 변화를 직접
  // 감지해 리사이즈 이벤트를 쏴준다.
  useEffect(() => {
    if (!loaded || !containerRef.current) return

    const observer = new ResizeObserver(() => {
      if (!mapRef.current) return
      window.naver.maps.Event.trigger(mapRef.current, 'resize')
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [loaded])

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
