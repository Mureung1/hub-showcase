const kakaoMapSdkId = 'kakao-map-sdk'

let kakaoMapPromise = null

export function loadKakaoMapSdk(appKey) {
  const normalizedAppKey = String(appKey || '').trim()

  if (!normalizedAppKey) {
    return Promise.reject(new Error('Kakao JavaScript 키가 설정되어 있지 않습니다.'))
  }

  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao.maps.load(() => resolve(window.kakao))
    })
  }

  if (kakaoMapPromise) {
    return kakaoMapPromise
  }

  kakaoMapPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(kakaoMapSdkId)
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.kakao.maps.load(() => resolve(window.kakao))
      })
      existingScript.addEventListener('error', () => reject(new Error('Kakao 지도 SDK 로드에 실패했습니다.')))
      return
    }

    const script = document.createElement('script')
    script.id = kakaoMapSdkId
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${normalizedAppKey}&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    script.onerror = () => reject(new Error('Kakao 지도 SDK 로드에 실패했습니다.'))
    document.head.appendChild(script)
  })

  return kakaoMapPromise
}
