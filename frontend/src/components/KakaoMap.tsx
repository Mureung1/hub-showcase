import { useEffect, useRef, useState } from 'react'
import './KakaoMap.css'

const CHUNGBUK_NATIONAL_UNIVERSITY = {
  latitude: 36.6283,
  longitude: 127.4565,
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

let kakaoMapsLoader: Promise<void> | null = null

function loadKakaoMaps(appKey: string) {
  if (window.kakao?.maps) {
    return new Promise<void>((resolve) => window.kakao.maps.load(resolve))
  }

  if (kakaoMapsLoader) return kakaoMapsLoader

  kakaoMapsLoader = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-maps-sdk]',
    )

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error('Kakao Maps SDK를 초기화할 수 없습니다.'))
        return
      }

      window.kakao.maps.load(resolve)
    }

    const handleError = () => {
      kakaoMapsLoader = null
      reject(new Error('Kakao Maps SDK를 불러오지 못했습니다.'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`
    script.async = true
    script.dataset.kakaoMapsSdk = 'true'
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return kakaoMapsLoader
}

function KakaoMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(() =>
    KAKAO_MAP_KEY ? null : 'Kakao Maps 키가 설정되지 않았습니다.',
  )

  useEffect(() => {
    const container = mapContainerRef.current

    if (!container || !KAKAO_MAP_KEY) return

    let isActive = true

    loadKakaoMaps(KAKAO_MAP_KEY)
      .then(() => {
        if (!isActive || !mapContainerRef.current) return

        const center = new window.kakao.maps.LatLng(
          CHUNGBUK_NATIONAL_UNIVERSITY.latitude,
          CHUNGBUK_NATIONAL_UNIVERSITY.longitude,
        )

        new window.kakao.maps.Map(mapContainerRef.current, {
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

export default KakaoMap
