import loadingAnimation from '../assets/로딩-애니메이션.mp4'

// 홈 화면에서 추천 fetch가 끝날 때까지, 배너·필터·리스트 대신 화면 전체를 덮는 로딩 영상+카피를 보여준다.
// 개발용 미리보기(?loading=1)도 같은 컴포넌트를 쓴다.
function LoadingIndicator() {
  return (
    <div className="relative left-1/2 h-[calc(100vh-92px)] w-screen -translate-x-1/2 overflow-hidden">
      <video src={loadingAnimation} autoPlay loop muted playsInline className="h-full w-full select-none object-cover" />
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-pill bg-bg-surface/90 px-4 py-2 font-display text-sm text-text-secondary shadow">
        끼니가 냉장고 재료로 만들 요리를 찾는 중...
      </p>
    </div>
  )
}

export default LoadingIndicator
