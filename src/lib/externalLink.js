import { Capacitor } from '@capacitor/core'

// 외부 링크(제휴/광고 링크, 네이버 지도 상세 등)를 연다. Capacitor 안드로이드 웹뷰에서는 `target="_blank"`
// /`window.open`이 앱 안에서 열려 뒤로가기로 못 빠져나오거나 아예 안 열리는 경우가 있어, 네이티브에서는
// 시스템 브라우저(@capacitor/browser)로 띄운다. 웹에서는 기존과 동일하게 새 탭으로 연다.
// @capacitor/core는 웹에서도 안전하게 import되며(isNativePlatform()은 웹에서 false), @capacitor/browser는
// 네이티브에서만 동적 import돼 웹 번들 로딩을 방해하지 않는다.
export async function openExternalLink(url) {
  if (!url || url === '#') return
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
