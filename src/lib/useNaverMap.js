// 네이버 지도 초기화 공용 훅 — SDK 로딩(useNaverMapLoader)까지 포함해 지도 인스턴스 생성·마커
// 배치·bounds 맞춤·컨테이너 리사이즈 감지를 한 번에 처리한다. "무엇을 어떻게 그릴지"(마커 좌표·
// 아이콘·정보창 내용)는 호출부가 markers 배열로 넘기고, "네이버 지도 SDK를 어떻게 다루는지"는
// 이 훅 하나로 모은다 — 5주차 §2(식비 위치 지도)에서 NaverPlaceMap.jsx(주변 식당)과 새 카페테리아
// 지도가 이 로직을 그대로 공유하기 위해 추출했다.
//
// markers[]: { id, lat, lng, icon?, content?(정보창 HTML, 없으면 클릭해도 아무 일 없음),
//   alwaysOpen?(true면 생성 즉시 정보창을 띄움 — "내 위치" 마커용) }
// icon?: { content: HTML문자열, size: [w,h], anchor: [x,y] } — naver.maps.Size/Point는 SDK 로드
// 전엔 존재하지 않으므로, 호출부는 순수 배열/문자열로만 넘기고 naver.maps 생성자 호출은 이 훅
// 안(이미 loaded를 확인한 시점)에서만 한다. 생략하면 SDK 기본 빨간 핀이 그려진다.
import { useEffect, useRef } from 'react'
import { useNaverMapLoader } from './useNaverMapLoader.js'

export function useNaverMap(containerRef, { center, zoom = 15, markers = [], fitToMarkers = true } = {}) {
  const { loaded, error } = useNaverMapLoader()
  const mapRef = useRef(null)

  // markers는 매 렌더마다 새 배열/객체로 넘어오기 쉬워 참조가 아니라 내용 조합(좌표 + 강조 여부로
  // 바뀌는 아이콘 모양)으로 변경을 감지한다.
  const markersSignature = JSON.stringify(markers.map((m) => [m.id, m.lat, m.lng, m.icon?.content, m.content, m.alwaysOpen]))

  useEffect(() => {
    if (!loaded || !containerRef.current || !center) return

    const { naver } = window
    const centerLatLng = new naver.maps.LatLng(center.lat, center.lng)
    const map = new naver.maps.Map(containerRef.current, { center: centerLatLng, zoom })
    mapRef.current = map

    const bounds = new naver.maps.LatLngBounds(centerLatLng, centerLatLng)
    let hasAny = false
    // 안정성 점검(Phase B) — 이 effect가 재실행될 때마다(마커 목록·중심좌표 변경 등) 매번 새
    // Marker/InfoWindow를 만들면서 예전엔 이전 것들을 정리하지 않았다 — 한 세션에서 검색을 여러 번
    // 반복하면 이전 지도 인스턴스가 물고 있던 마커·리스너가 계속 쌓였다. 여기서 만든 것만 이 effect의
    // cleanup에서 setMap(null)로 지도에서 떼어낸다(Naver Maps JS API v3의 표준 제거 방법).
    const createdMarkers = []

    markers.forEach((m) => {
      const position = new naver.maps.LatLng(m.lat, m.lng)
      bounds.extend(position)
      hasAny = true

      const icon = m.icon
        ? {
            content: m.icon.content,
            size: new naver.maps.Size(...m.icon.size),
            anchor: new naver.maps.Point(...m.icon.anchor),
          }
        : undefined
      const marker = new naver.maps.Marker({ map, position, icon, zIndex: m.zIndex })
      createdMarkers.push(marker)

      if (m.content) {
        const infoWindow = new naver.maps.InfoWindow({ content: m.content })
        naver.maps.Event.addListener(marker, 'click', () => infoWindow.open(map, marker))
        if (m.alwaysOpen) infoWindow.open(map, marker)
      }
    })

    // 마커가 없을 때(내 위치 핀만 있는 경우 등) fitBounds는 최대 줌으로 조여버리므로 중심만 잡는다.
    if (fitToMarkers && hasAny) {
      map.fitBounds(bounds)
    }

    // 컨테이너가 처음 그려질 때 아직 레이아웃 크기가 확정되지 않아 지도가 깨져 보이는 경우가 있어,
    // 다음 틱에 리사이즈 이벤트를 한 번 더 쏴서 바로잡는다.
    const relayoutTimer = setTimeout(() => {
      naver.maps.Event.trigger(map, 'resize')
      if (fitToMarkers && hasAny) {
        map.fitBounds(bounds)
      } else {
        map.setCenter(centerLatLng)
      }
    }, 0)

    return () => {
      clearTimeout(relayoutTimer)
      createdMarkers.forEach((marker) => marker.setMap(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, containerRef, center?.lat, center?.lng, zoom, fitToMarkers, markersSignature])

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
  }, [loaded, containerRef])

  return { loaded, error }
}
