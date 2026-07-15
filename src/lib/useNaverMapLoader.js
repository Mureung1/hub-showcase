import { useEffect, useState } from 'react'

// 카카오 지도(useKakaoLoader.js)의 네이버 버전. 롤백을 위해 카카오 쪽 파일은 그대로 남겨두고,
// 화면은 이 훅을 쓰는 NaverPlaceMap으로 갈아탄다.
const SDK_ID = 'naver-maps-sdk'

// 여러 컴포넌트/리렌더에서 훅이 동시에 쓰여도 스크립트 로드는 한 번만 하도록 모듈 전역 상태로 관리한다.
let sdkState = 'idle' // 'idle' | 'loading' | 'loaded' | 'error'
let sdkError = ''
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}

function ensureNaverSdkLoading() {
  if (sdkState !== 'idle') return

  if (window.naver?.maps) {
    sdkState = 'loaded'
    return
  }

  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID
  if (!clientId) {
    sdkState = 'error'
    sdkError = '네이버 지도 키(VITE_NAVER_MAP_CLIENT_ID)가 설정되지 않았습니다.'
    return
  }

  sdkState = 'loading'

  // 네이버 지도 SDK는 키/도메인 인증에 실패해도 스크립트 자체는 정상 로드(onload 발생)된다 — 인증
  // 실패 여부는 이 전역 콜백으로만 알 수 있다. onload가 먼저 오고 인증 실패가 뒤늦게 올 수도 있어,
  // 이미 loaded로 넘어간 뒤라도 error로 덮어써야 한다.
  window.navermap_authFailure = () => {
    sdkState = 'error'
    sdkError = '지도 인증 실패: 네이버 지도 키 또는 등록된 서비스 도메인을 확인해주세요.'
    notify()
  }

  const script = document.createElement('script')
  script.id = SDK_ID
  script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`
  script.async = true
  script.onload = () => {
    if (sdkState === 'error') return // navermap_authFailure가 먼저 왔으면 그대로 둔다
    sdkState = 'loaded'
    notify()
  }
  script.onerror = () => {
    sdkState = 'error'
    sdkError = '네이버 지도 SDK 로드에 실패했습니다.'
    notify()
  }
  document.head.appendChild(script)
}

export function useNaverMapLoader() {
  const [, forceRender] = useState(0)

  useEffect(() => {
    ensureNaverSdkLoading()
    // ensureNaverSdkLoading이 동기적으로 loaded/error까지 끝냈을 수도 있으니(이미 로드됨, 키 누락 등)
    // 한 번은 무조건 다시 그려서 최신 상태를 반영한다.
    forceRender((n) => n + 1)
    if (sdkState === 'loading') {
      const listener = () => forceRender((n) => n + 1)
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }, [])

  return { loaded: sdkState === 'loaded', error: sdkState === 'error' ? sdkError : '' }
}
