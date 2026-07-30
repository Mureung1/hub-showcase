import { useEffect, useRef, useState } from 'react'
import { loadKakaoMapSdk } from '../../utils/kakaoMapLoader'

function hasMapCoordinates(travelContext) {
  return Boolean(
    travelContext?.listingLocation?.x
    && travelContext?.listingLocation?.y
    && travelContext?.school?.x
    && travelContext?.school?.y,
  )
}

function createLatLngPath(kakao, route) {
  if (!route?.pathPoints?.length) {
    return []
  }

  return route.pathPoints.map((point) => new kakao.maps.LatLng(Number(point.y), Number(point.x)))
}

function KakaoRouteMap({ route, travelContext }) {
  const mapRef = useRef(null)
  const [statusMessage, setStatusMessage] = useState('지도를 준비하고 있습니다.')
  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY

  useEffect(() => {
    if (!hasMapCoordinates(travelContext)) {
      setStatusMessage('지도에 표시할 좌표가 없습니다.')
      return undefined
    }

    let isMounted = true

    async function renderMap() {
      setStatusMessage('카카오 지도 SDK를 불러오고 있습니다.')

      try {
        const kakao = await loadKakaoMapSdk(appKey)
        if (!isMounted || !mapRef.current) {
          return
        }

        const listingPosition = new kakao.maps.LatLng(
          Number(travelContext.listingLocation.y),
          Number(travelContext.listingLocation.x),
        )
        const schoolPosition = new kakao.maps.LatLng(
          Number(travelContext.school.y),
          Number(travelContext.school.x),
        )

        const map = new kakao.maps.Map(mapRef.current, {
          center: listingPosition,
          level: 5,
        })

        const bounds = new kakao.maps.LatLngBounds()
        bounds.extend(listingPosition)
        bounds.extend(schoolPosition)
        const routePath = createLatLngPath(kakao, route)
        routePath.forEach((point) => bounds.extend(point))

        new kakao.maps.Marker({
          map,
          position: listingPosition,
          title: '매물 위치',
        })

        new kakao.maps.Marker({
          map,
          position: schoolPosition,
          title: travelContext.school.name || '학교',
        })

        new kakao.maps.Polyline({
          map,
          path: routePath.length ? routePath : [listingPosition, schoolPosition],
          strokeWeight: 4,
          strokeColor: '#2563eb',
          strokeOpacity: 0.8,
          strokeStyle: 'solid',
        })

        map.setBounds(bounds)
        window.setTimeout(() => {
          if (!isMounted) {
            return
          }

          map.relayout()
          map.setBounds(bounds)
          setStatusMessage('')
        }, 120)
      } catch (error) {
        if (isMounted) {
          setStatusMessage(error.message)
        }
      }
    }

    renderMap()

    return () => {
      isMounted = false
    }
  }, [appKey, route, travelContext])

  if (!hasMapCoordinates(travelContext)) {
    return null
  }

  return (
    <div className="route-map-panel">
      <div className="route-map" ref={mapRef} aria-label="매물과 학교 위치를 표시한 지도" />
      {statusMessage && <p className="helper-text">{statusMessage}</p>}
      <p className="helper-text">
        카카오 경로 좌표가 없는 경우에만 두 지점을 직선으로 연결해 표시합니다.
      </p>
    </div>
  )
}

export default KakaoRouteMap
