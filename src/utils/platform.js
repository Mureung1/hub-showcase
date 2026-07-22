// 실행 환경 감지 단일 유틸(PRD v2.0 FR-2.3). 플랫폼별 분기는 전부 이 함수 하나를 기준으로 한다 —
// 화면/라이브러리 코드가 각자 Capacitor나 UA를 직접 들여다보지 않게 하기 위해서다.
//
//   'apk'        : Capacitor 안드로이드 웹뷰 앱 (파일 저장은 @capacitor/filesystem, 외부 링크는 시스템 브라우저)
//   'mobile-web' : 모바일 브라우저 (동작은 웹과 같지만, 안내 문구가 "다운로드 폴더" 기준이라 구분한다)
//   'web'        : PC 브라우저
//
// 확장자가 .ts가 아니라 .js인 이유: 이 저장소는 tsconfig도 typescript 의존성도 없는 순수 JS/JSX
// 프로젝트다(package.json 참고). .ts 파일 하나만 끼워 넣으면 타입 검사 이득은 전혀 없이 빌드/린트
// 설정만 어긋나므로, PRD가 지정한 경로(src/utils/platform)는 그대로 따르고 확장자만 맞췄다.

export const PLATFORM = {
  WEB: 'web',
  MOBILE_WEB: 'mobile-web',
  APK: 'apk',
}

// Capacitor가 설치되지 않았거나(웹 전용 빌드) 번들에서 제외된 상황에서도 이 유틸이 던지지 않도록,
// 모듈 참조 자체를 try로 감싼다. import는 정적으로 두되(동적 import로 만들면 getPlatform이 비동기가
// 되어 호출부가 전부 오염된다) 접근은 방어적으로 한다.
import { Capacitor } from '@capacitor/core'

function isCapacitorNative() {
  try {
    return typeof Capacitor?.isNativePlatform === 'function' && Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

// iPadOS 13+는 UA를 데스크톱 Mac으로 위장하므로 터치 포인트 수로 한 번 더 걸러낸다.
function isMobileUserAgent() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/Android|iPhone|iPod|iPad|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1
}

export function getPlatform() {
  if (isCapacitorNative()) return PLATFORM.APK
  return isMobileUserAgent() ? PLATFORM.MOBILE_WEB : PLATFORM.WEB
}

// 네이티브(APK)에서만 쓰는 경로가 있는지 판단하는 짧은 별칭.
export function isApk() {
  return getPlatform() === PLATFORM.APK
}

// 'web' | 'mobile-web' 둘 다 브라우저 다운로드 경로를 쓴다.
export function isBrowser() {
  return !isApk()
}
