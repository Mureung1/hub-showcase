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

// fitBounds가 내려갈 수 있는 최저 줌. 네이버 줌은 값이 클수록 확대이고 6쯤이면 남한 전체가 들어온다.
// 마커 하나가 멀리 떨어져 있으면(내 위치는 서울인데 핀은 대전) fitBounds가 둘 다 담으려고 전국 지도로
// 줌아웃해버리는데, 그 화면은 "주변 식당"에도 "우리 학교 위치"에도 아무 쓸모가 없다.
// 12면 도시 하나가 화면에 들어오는 수준이라, 멀리 있는 핀은 화면 밖으로 나가더라도 중심 주변이
// 읽히는 쪽을 택한다.
const MIN_FIT_ZOOM = 12
export const DEFAULT_MAP_ZOOM = 15

export function useNaverMap(containerRef, { center, zoom = DEFAULT_MAP_ZOOM, markers = [], fitToMarkers = true } = {}) {
  const { loaded, error } = useNaverMapLoader()
  const mapRef = useRef(null)

  // markers는 매 렌더마다 새 배열/객체로 넘어오기 쉬워 참조가 아니라 내용 조합(좌표 + 강조 여부로
  // 바뀌는 아이콘 모양)으로 변경을 감지한다.
  const markersSignature = JSON.stringify(
    markers.map((m) => [m.id, m.lat, m.lng, m.icon?.content, m.content, m.alwaysOpen, m.skipBounds]),
  )

  useEffect(() => {
    if (!loaded || !containerRef.current || !center) return

    const { naver } = window
    const centerLatLng = new naver.maps.LatLng(center.lat, center.lng)
    const map = new naver.maps.Map(containerRef.current, { center: centerLatLng, zoom })
    mapRef.current = map

    // bounds는 첫 번째 "화면 맞춤 대상" 마커로 시작한다. 예전처럼 centerLatLng(=내 위치)로 씨앗을
    // 깔면 skipBounds로 내 위치 마커를 빼도 중심이 bounds에 그대로 남아, 대학 학식당만 담으려 해도
    // 내 위치가 계속 끌려 들어온다.
    let bounds = null
    let hasAny = false
    // 안정성 점검(Phase B) — 이 effect가 재실행될 때마다(마커 목록·중심좌표 변경 등) 매번 새
    // Marker/InfoWindow를 만들면서 예전엔 이전 것들을 정리하지 않았다 — 한 세션에서 검색을 여러 번
    // 반복하면 이전 지도 인스턴스가 물고 있던 마커·리스너가 계속 쌓였다. 여기서 만든 것만 이 effect의
    // cleanup에서 setMap(null)로 지도에서 떼어낸다(Naver Maps JS API v3의 표준 제거 방법).
    const createdMarkers = []

    markers.forEach((m) => {
      const position = new naver.maps.LatLng(m.lat, m.lng)
      // skipBounds: 지도에는 그리되 화면 맞춤 계산에서는 뺀다("내 위치"가 멀리 있어도 그것 때문에
      // 줌아웃하지 않게). 마커 자체는 그대로 보인다.
      if (!m.skipBounds) {
        if (bounds) bounds.extend(position)
        else bounds = new naver.maps.LatLngBounds(position, position)
        hasAny = true
      }

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
    // 반대 방향의 사고(멀리 떨어진 핀 하나 때문에 전국 지도로 줌아웃)는 fitBoundsClamped가 막는다.
    const fitBoundsClamped = () => {
      map.fitBounds(bounds)
      if (map.getZoom() < MIN_FIT_ZOOM) {
        // 줌만 되돌리면 중심이 두 핀의 중간(아무것도 없는 곳)에 남는다 — 중심도 함께 되돌린다.
        map.setZoom(MIN_FIT_ZOOM)
        map.setCenter(centerLatLng)
      }
    }
    if (fitToMarkers && hasAny) {
      fitBoundsClamped()
    }

    // 컨테이너가 처음 그려질 때 아직 레이아웃 크기가 확정되지 않아 지도가 깨져 보이는 경우가 있어,
    // 다음 틱에 리사이즈 이벤트를 한 번 더 쏴서 바로잡는다.
    const relayoutTimer = setTimeout(() => {
      naver.maps.Event.trigger(map, 'resize')
      if (fitToMarkers && hasAny) {
        fitBoundsClamped()
      } else {
        map.setCenter(centerLatLng)
      }
    }, 0)

    return () => {
      clearTimeout(relayoutTimer)
      createdMarkers.forEach((marker) => marker.setMap(null))
      // 지도 인스턴스도 반드시 파괴한다. 이 effect는 매번 **같은 DOM 노드 위에** 새 Map을 만드는데,
      // 네이버 지도 v3는 컨테이너에 자체 레이어를 append할 뿐 기존 자식을 지우지 않는다 — 정리하지
      // 않으면 재실행할 때마다 지도 DOM과 이벤트 리스너·타일 요청이 겹겹이 쌓인다.
      // 이번 세션에 center(focus)와 fitToMarkers(fitPlacesOnly)가 화면 조작으로 바뀌는 값이 되면서
      // 재실행 빈도가 크게 올라갔다(세그먼트 토글·검색마다 재생성). 웹뷰는 세션이 오래 살아 있어
      // "지도 탭이 점점 느려진다"로 나타난다.
      map.destroy?.()
      if (mapRef.current === map) mapRef.current = null
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
