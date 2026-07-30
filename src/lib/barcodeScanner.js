// FR-7 — 브라우저 내장 BarcodeDetector API 래퍼. 네이티브 플러그인이 아니라 표준 웹 API라 카카시터
// 재빌드 없이 쓸 수 있다(Android Chrome/WebView 83+). 미지원 기기에서는 호출부가 이 함수로 먼저
// 확인해 버튼 자체를 숨긴다 — 비활성 버튼이나 에러로 보여주지 않는다.
export function isBarcodeDetectorSupported() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

// videoElement에서 barcode(EAN-13 등)를 주기적으로 찾는다. 찾으면 그 rawValue로 resolve, stop()이
// 호출되면(사용자가 취소하는 등) null로 resolve한다. detectorFactory는 테스트에서 실제
// window.BarcodeDetector 없이도 이 폴링 루프를 검증할 수 있게 하는 주입 지점이다.
export function scanBarcodeFromVideo(
  videoElement,
  { intervalMs = 300, formats = ['ean_13'], detectorFactory = (opts) => new window.BarcodeDetector(opts) } = {},
) {
  if (!isBarcodeDetectorSupported()) {
    return { promise: Promise.resolve(null), stop: () => {} }
  }

  const detector = detectorFactory({ formats })
  let stopped = false
  let timer = null
  let resolvePromise = () => {}

  const promise = new Promise((resolve) => {
    resolvePromise = resolve
    async function tick() {
      if (stopped) return
      try {
        const codes = await detector.detect(videoElement)
        if (stopped) return
        if (codes.length > 0) {
          stopped = true
          resolve(codes[0].rawValue)
          return
        }
      } catch {
        // 프레임이 아직 준비 안 됐거나 일시적으로 디코딩에 실패한 경우 — 다음 틱에서 계속 시도한다.
      }
      timer = setTimeout(tick, intervalMs)
    }
    tick()
  })

  // 사용자가 취소하거나 컴포넌트가 언마운트될 때 호출 — 폴링을 멈추고 promise를 null로 정리해,
  // 기다리고 있던 호출부가 영원히 걸려 있지 않게 한다.
  function stop() {
    if (stopped) return
    stopped = true
    if (timer) clearTimeout(timer)
    resolvePromise(null)
  }

  return { promise, stop }
}
