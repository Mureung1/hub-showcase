import { useRef } from 'react'
import loadingAnimation from '../assets/로딩-애니메이션.mp4'

// 홈 화면에서 추천 fetch가 끝날 때까지, 배너·필터·리스트 대신 화면 전체를 덮는 로딩 영상+카피를 보여준다.
// 개발용 미리보기(?loading=1)도 같은 컴포넌트를 쓴다.
function LoadingIndicator({ onFirstLoopEnd }) {
  const lastTimeRef = useRef(0)
  const firedRef = useRef(false)

  // loop 속성을 쓰면 video의 ended 이벤트가 안 터져서, currentTime이 이전 값보다 줄어드는(처음으로
  // 되감기는) 순간을 감지해 "한 바퀴 다 돌았다"로 판단한다. fetch가 아무리 빨리 끝나도 영상이 중간에
  // 끊기지 않고 최소 한 바퀴는 다 보이게 하기 위함 — 영상 길이가 바뀌어도 코드 수정 없이 그대로 동작.
  function handleTimeUpdate(event) {
    const currentTime = event.currentTarget.currentTime
    if (!firedRef.current && currentTime < lastTimeRef.current) {
      firedRef.current = true
      onFirstLoopEnd?.()
    }
    lastTimeRef.current = currentTime
  }

  return (
    <div className="relative left-1/2 h-[calc(100vh-92px)] w-screen -translate-x-1/2 overflow-hidden">
      <video
        src={loadingAnimation}
        autoPlay
        loop
        muted
        playsInline
        onTimeUpdate={handleTimeUpdate}
        className="h-full w-full select-none object-cover"
      />
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-pill bg-bg-surface/90 px-4 py-2 font-display text-sm text-text-secondary shadow">
        끼니가 냉장고 재료로 만들 요리를 찾는 중...
      </p>
    </div>
  )
}

export default LoadingIndicator
