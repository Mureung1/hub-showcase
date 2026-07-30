import { useEffect, useMemo, useRef, useState } from 'react'
import { loadKakaoMapSdk } from '../../utils/kakaoMapLoader'

function getMappableItems(savedItems) {
  return savedItems.filter((item) => {
    const location = item.analysis?.travelContext?.listingLocation
    return Number.isFinite(Number(location?.x)) && Number.isFinite(Number(location?.y))
  })
}

function getListingTitle(item, index) {
  return item.analysisRequest?.listingInfo?.fields?.address
    || item.analysisRequest?.listingSummary?.address
    || `저장 매물 ${index + 1}`
}

function SavedListingsMap({ savedItems }) {
  const mapRef = useRef(null)
  const [statusMessage, setStatusMessage] = useState('')
  const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY
  const mappableItems = useMemo(() => getMappableItems(savedItems), [savedItems])

  useEffect(() => {
    if (!mappableItems.length) {
      setStatusMessage('지도에 표시할 저장 매물 좌표가 없습니다.')
      return undefined
    }

    let isMounted = true

    async function renderMap() {
      setStatusMessage('지도를 불러오고 있습니다.')

      try {
        const kakao = await loadKakaoMapSdk(appKey)
        if (!isMounted || !mapRef.current) {
          return
        }

        const firstLocation = mappableItems[0].analysis.travelContext.listingLocation
        const center = new kakao.maps.LatLng(Number(firstLocation.y), Number(firstLocation.x))
        const map = new kakao.maps.Map(mapRef.current, {
          center,
          level: 5,
        })
        const bounds = new kakao.maps.LatLngBounds()

        mappableItems.forEach((item, index) => {
          const location = item.analysis.travelContext.listingLocation
          const position = new kakao.maps.LatLng(Number(location.y), Number(location.x))
          bounds.extend(position)

          new kakao.maps.Marker({
            map,
            position,
            title: getListingTitle(item, index),
          })
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
  }, [appKey, mappableItems])

  return (
    <section className="home-map-card" aria-labelledby="home-map-title">
      <h2 id="home-map-title">저장 매물 위치</h2>
      <div className="home-map" ref={mapRef} aria-label="저장 매물 위치 지도" />
      {statusMessage && <p className="helper-text">{statusMessage}</p>}
    </section>
  )
}

export default SavedListingsMap
