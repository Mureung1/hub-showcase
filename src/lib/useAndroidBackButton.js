import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

// 안드로이드 하드웨어 뒤로가기 버튼 처리.
// - 열려 있는 모달/시트가 있으면 **그것부터 닫는다**(화면 이동도 종료도 하지 않는다).
// - 앱 내 하위 화면(식단/캘린더/지도/MY 등)에서 누르면 이전 화면으로 이동한다.
// - 첫 화면(분석 홈, "/" 또는 "/analyze")에서 누르면 앱을 종료한다.
// 웹에서는 Capacitor.isNativePlatform()이 false라 아무 것도 하지 않으므로 웹 빌드/동작에 영향이 없다.
// @capacitor/app은 네이티브에서만 동적 import 되어(웹 번들에는 별도 청크로 분리) 웹 초기 로드를 늦추지 않는다.

// 열린 모달을 Escape로 닫는다. 안드로이드 웹뷰에서는 하드웨어 back이 keydown을 만들지 않아서
// useFocusTrap의 Escape 처리가 영영 발동하지 않는다 — 그래서 여기서 대신 쏴 준다.
//
// 왜 오버레이마다 콜백을 등록받는 대신 이 방식인가: 이 앱의 모달/시트는 전부 useFocusTrap을 쓰고
// 그게 이미 Escape를 각자의 onCancel로 연결해 둔다. 같은 통로를 재사용하면 오버레이를 하나도 안
// 고치고 전부 커버되고, 앞으로 추가되는 오버레이도 자동으로 포함된다.
// busy 중인 모달은 useFocusTrap에 onEscape가 undefined로 들어가 있어 닫히지 않는데, 그때도 true를
// 돌려주는 게 맞다 — 저장/삭제 중에 뒤로가기로 앱이 꺼지면 안 된다.
function closeTopmostOverlay() {
  const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
  const top = dialogs[dialogs.length - 1]
  if (!top) return false
  top.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  return true
}

export function useAndroidBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let listenerHandle
    let removed = false

    import('@capacitor/app')
      .then(({ App }) =>
        App.addListener('backButton', () => {
          // 모달이 떠 있으면 그걸 닫는 게 사용자가 기대하는 동작이다. 예전엔 이 분기가 없어서
          // 홈(/analyze)에서 사진 출처 시트를 열고 뒤로가기를 누르면 **앱이 그대로 종료**됐다
          // (입력해둔 메뉴명·브랜드까지 함께 소실).
          if (closeTopmostOverlay()) return

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
