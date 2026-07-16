const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

let kakaoMapsLoader: Promise<void> | null = null

export function loadKakaoMaps() {
  if (!KAKAO_MAP_KEY) {
    return Promise.reject(new Error('Kakao Maps 키가 설정되지 않았습니다.'))
  }

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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_KEY)}&autoload=false&libraries=services`
    script.async = true
    script.dataset.kakaoMapsSdk = 'true'
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return kakaoMapsLoader
}

export const hasKakaoMapKey = Boolean(KAKAO_MAP_KEY)
