import { useEffect, useState } from 'react'

const SDK_ID = 'kakao-maps-sdk'
let loadPromise = null

function loadKakaoSdk() {
  if (window.kakao?.maps) return Promise.resolve()
  if (loadPromise) return loadPromise

  const appKey = import.meta.env.VITE_KAKAO_JS_KEY
  if (!appKey) {
    return Promise.reject(new Error('카카오 지도 키(VITE_KAKAO_JS_KEY)가 설정되지 않았습니다.'))
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SDK_ID)
    if (existing) {
      existing.addEventListener('load', () => window.kakao.maps.load(resolve))
      existing.addEventListener('error', () => reject(new Error('카카오 지도 SDK 로드에 실패했습니다.')))
      return
    }

    const script = document.createElement('script')
    script.id = SDK_ID
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => window.kakao.maps.load(resolve)
    script.onerror = () => reject(new Error('카카오 지도 SDK 로드에 실패했습니다.'))
    document.head.appendChild(script)
  }).catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}

export function useKakaoLoader() {
  const [loaded, setLoaded] = useState(Boolean(window.kakao?.maps))
  const [error, setError] = useState('')

  useEffect(() => {
    if (loaded) return
    let cancelled = false

    loadKakaoSdk()
      .then(() => {
        if (!cancelled) setLoaded(true)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '카카오 지도 SDK 로드에 실패했습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [loaded])

  return { loaded, error }
}
