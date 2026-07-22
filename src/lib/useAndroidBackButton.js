import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

// 안드로이드 하드웨어 뒤로가기 버튼 처리.
// - 앱 내 하위 화면(식단/캘린더/지도/MY 등)에서 누르면 이전 화면으로 이동한다.
// - 첫 화면(분석 홈, "/" 또는 "/analyze")에서 누르면 앱을 종료한다.
// 웹에서는 Capacitor.isNativePlatform()이 false라 아무 것도 하지 않으므로 웹 빌드/동작에 영향이 없다.
// @capacitor/app은 네이티브에서만 동적 import 되어(웹 번들에는 별도 청크로 분리) 웹 초기 로드를 늦추지 않는다.
export function useAndroidBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let listenerHandle
    let removed = false

    import('@capacitor/app')
      .then(({ App }) =>
        App.addListener('backButton', () => {
          const path = window.location.pathname
          const atHome = path === '/' || path === '/analyze'
          if (!atHome && window.history.length > 1) {
            window.history.back()
          } else {
            App.exitApp()
          }
        }),
      )
      .then((handle) => {
        // 리스너가 등록되기 전에 언마운트됐다면 즉시 제거한다.
        if (removed) handle.remove()
        else listenerHandle = handle
      })
      .catch(() => {
        // @capacitor/app 로드 실패 시엔 안드로이드 기본 뒤로가기 동작에 맡긴다.
      })

    return () => {
      removed = true
      if (listenerHandle) listenerHandle.remove()
    }
  }, [])
}
