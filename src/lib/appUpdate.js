// 배포된 새 버전 감지.
//
// 서버 URL 방식이라 "웹 배포 = 앱 업데이트"인데, 그게 반영되려면 **웹뷰가 페이지를 다시 불러와야
// 한다.** 앱을 백그라운드에 두었다가 다시 열면 메모리에 있던 옛 화면이 그대로 살아 있어서, 사용자
// 입장에서는 "분명히 고쳤다는데 앱은 그대로"가 된다. 앱을 완전히 종료했다 켜야 최신이 되는데 그걸
// 알 방법이 없다.
//
// 그래서 앱이 포그라운드로 돌아올 때 서버의 index.html을 확인하고, 실행 중인 번들과 다르면
// 토스트로 알린다.
//
// ⚠️ **강제로 새로고침하지 않는다.** 사진 분석이 돌아가는 중이거나 폼을 채우던 중에 웹뷰를 리로드하면
// 그 작업이 통째로 날아간다. 알리기만 하고 새로고침은 사용자가 누른다 — 판 단위 검증(mealStandards)이
// 경고만 하고 값은 안 고치는 것과 같은 이유다.
//
// 빌드 식별자로 **해시가 박힌 번들 파일명**을 쓴다(vite가 내용 해시를 파일명에 넣는다). 별도의 버전
// 파일을 두지 않는 이유: 그러면 배포할 때마다 사람이 올려야 하고, 한 번 잊는 순간 이 기능이 조용히
// "항상 최신입니다"라고 거짓말을 하기 시작한다. 파일명은 내용이 바뀌면 반드시 바뀐다.
import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { useToast } from '../context/ToastContext.jsx'

// 앱을 잠깐 전환한 정도(알림 확인, 사진첩 다녀오기)로는 확인하지 않는다 — 그 사이 배포가 일어났을
// 리도 없고, 포그라운드 복귀마다 네트워크를 한 번씩 더 쓰는 게 아깝다.
const MIN_BACKGROUND_MS = 60_000
// 같은 세션에서 너무 잦게 묻지 않는다.
const MIN_CHECK_INTERVAL_MS = 5 * 60_000

// index.html에서 진입 번들 경로를 뽑는다. 문자열 파싱인 이유: 이건 우리가 만든 index.html이고
// 형태가 고정돼 있는데(vite가 생성), 이것 하나 때문에 DOMParser로 문서를 통째로 파싱할 이유가 없다.
export function parseBuildId(html) {
  if (typeof html !== 'string') return null
  const match = /<script[^>]+\bsrc="(\/assets\/[^"]+\.js)"/.exec(html)
  return match ? match[1] : null
}

// 지금 실행 중인 번들의 경로. src가 절대 URL로 나오므로 pathname만 떼어 parseBuildId 결과와 모양을 맞춘다.
export function getRunningBuildId(doc = typeof document === 'undefined' ? null : document) {
  const el = doc?.querySelector?.('script[type="module"][src*="/assets/"]')
  const src = el?.getAttribute?.('src')
  if (!src) return null
  try {
    return new URL(src, 'http://x').pathname
  } catch {
    return null
  }
}

// 서버에 배포돼 있는 번들 경로. 실패하면 null — 오프라인이나 일시적 오류를 업데이트로 오인하면 안 된다.
export async function fetchDeployedBuildId({ fetchImpl, signal } = {}) {
  const doFetch = fetchImpl ?? (typeof fetch === 'function' ? fetch : null)
  if (!doFetch) return null
  try {
    // index.html은 must-revalidate라 보통은 최신이 오지만, 웹뷰가 오프라인 캐시를 들고 있을 수 있어
    // 명시적으로 우회한다. 이 확인 자체가 옛 답을 받으면 존재 이유가 없어진다.
    const res = await doFetch('/index.html', { cache: 'no-store', signal })
    if (!res?.ok) return null
    return parseBuildId(await res.text())
  } catch {
    return null
  }
}

// running/deployed 중 하나라도 모르면 "새 버전 없음"으로 본다 — 근거가 없을 때 알림을 띄우면
// 사용자는 눌러도 아무것도 안 바뀌는 새로고침을 반복하게 된다.
export function isUpdateAvailable(runningId, deployedId) {
  if (!runningId || !deployedId) return false
  return runningId !== deployedId
}

// 네이티브에서만 동작한다. 웹 브라우저는 사용자가 새로고침하면 그만이고, 탭을 오래 열어두는 경우도
// 웹뷰처럼 무기한은 아니다.
// 로컬 번들 모드(capacitor://localhost)에서는 /index.html이 APK 안의 그 파일이라 running과 항상
// 같아진다 — 즉 아무 일도 하지 않는다. 별도 분기가 필요 없다.
export function useAppUpdateCheck() {
  const { showToast } = useToast()
  // 같은 배포에 대해 반복해서 알리지 않는다.
  const notifiedRef = useRef(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let listenerHandle
    let removed = false
    let backgroundedAt = null
    let lastCheckedAt = 0

    async function checkNow() {
      const runningId = getRunningBuildId()
      if (!runningId) return
      const deployedId = await fetchDeployedBuildId()
      if (removed) return
      if (!isUpdateAvailable(runningId, deployedId)) return
      if (notifiedRef.current === deployedId) return
      notifiedRef.current = deployedId

      showToast('새 버전이 배포됐어요', {
        tone: 'info',
        // 누르면 작업 중이던 화면이 사라진다. 그래서 자동이 아니라 사용자가 누르는 것이다.
        action: { label: '새로고침', onClick: () => window.location.reload() },
        duration: 10000,
      })
    }

    import('@capacitor/app')
      .then(({ App }) =>
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            backgroundedAt = Date.now()
            return
          }
          const awayMs = backgroundedAt ? Date.now() - backgroundedAt : 0
          backgroundedAt = null
          if (awayMs < MIN_BACKGROUND_MS) return
          if (Date.now() - lastCheckedAt < MIN_CHECK_INTERVAL_MS) return
          lastCheckedAt = Date.now()
          checkNow()
        }),
      )
      .then((handle) => {
        // 리스너가 붙기 전에 언마운트됐다면 즉시 뗀다(useAndroidBackButton과 같은 이유).
        if (removed) handle.remove()
        else listenerHandle = handle
      })
      .catch(() => {
        // @capacitor/app 로드 실패는 무시한다 — 콜드 스타트라는 원래 경로가 그대로 남아 있다.
      })

    return () => {
      removed = true
      if (listenerHandle) listenerHandle.remove()
    }
  }, [showToast])
}
