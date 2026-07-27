import loadingAnimation from '../assets/로딩-애니메이션.mp4'

const COPY = '끼니가 냉장고 재료로 만들 요리를 찾는 중...'

// 홈 화면에서 fetch 진행 중일 때(작게, 인라인) / 개발용 로딩 미리보기(?loading=1, 전체화면)
// 두 군데에서 같은 로딩 영상+카피를 쓰던 걸 하나로 합침 (DESIGN_SYSTEM.md `inline-loading` 패턴).
function LoadingIndicator({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="relative left-1/2 h-[calc(100vh-92px)] w-screen -translate-x-1/2 overflow-hidden">
        <video src={loadingAnimation} autoPlay loop muted playsInline className="h-full w-full select-none object-cover" />
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-pill bg-bg-surface/90 px-4 py-2 font-display text-sm text-text-secondary shadow">
          {COPY}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center justify-center gap-2 px-8">
      <video src={loadingAnimation} autoPlay loop muted playsInline className="w-10 select-none" />
      <p className="font-display text-sm text-text-secondary">{COPY}</p>
    </div>
  )
}

export default LoadingIndicator
