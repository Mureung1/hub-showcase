import { useCallback, useRef, useState } from 'react'

// 터치/클릭 프레스 피드백을 담당하는 **단 하나의** 컴포넌트(PRD v2.0 FR-4.1). 하단 탭 아이콘, 주요
// 버튼, 카드형 리스트 아이템이 전부 이걸 거친다 — 개별 컴포넌트가 각자 scale 애니메이션을 복붙하면
// 값이 조금씩 어긋나 앱 전체의 촉감이 흐트러진다.
//
// [왜 CSS인가 — framer-motion 대신]
// PRD FR-4.3이 라이브러리로 framer-motion을 후보로 두되 "번들 영향 확인 후 최종 채택"을 조건으로 달았다.
// 실측 결과 이 앱 번들이 gzip 170.01KB -> 211.08KB로 **+41.07KB(+24%)** 늘었다. 이 앱은 APK가 원격
// URL을 그대로 로드하는 구조라(capacitor.config.json의 server.url) 그 증가분을 콜드 스타트마다 모바일
// 네트워크로 받는다. 반면 PRD가 요구하는 모션(프레스 scale 0.96, 1회 바운스, 250~300ms 방향성 슬라이드,
// reduce-motion 시 페이드)은 전부 transform/opacity만 쓰는 CSS로 그대로 표현할 수 있어 라이브러리가
// 주는 이득이 없다. 그래서 채택하지 않고 CSS 트랜지션으로 구현했다(전환 방향 처리는
// lib/useTabTransition.js 참고).
//
// [왜 :active만으로 안 되나]
// CSS :active는 터치 기기에서 스크롤 제스처와 섞이면 눌린 상태가 남거나 아예 안 걸리는 경우가 있다.
// 포인터 이벤트로 직접 상태를 잡으면 스크롤로 손가락이 벗어났을 때(pointercancel/leave) 확실히 풀린다.

// 눌림 정도 — PRD FR-4.1(scale 0.96~0.97 + 미세 투명도 변화).
const PRESSED_SCALE = 0.96
const PRESSED_OPACITY = 0.92

// 누를 땐 즉시 반응하고(터치 후 100ms 이내 시각 피드백), 뗄 땐 스프링 곡선으로 되돌아온다.
const PRESS_IN_TRANSITION = 'transform 90ms ease-out, opacity 90ms ease-out'
const PRESS_OUT_TRANSITION = 'transform 200ms cubic-bezier(0.22, 1.2, 0.36, 1), opacity 200ms ease-out'

// as: 렌더할 태그/컴포넌트('button' 기본, 링크면 'a', 카드면 'div').
// scale: 항목이 커서 0.96이 과하게 느껴질 때만 개별 조정(카드처럼 큰 면적은 0.98이 자연스럽다).
export default function Pressable({
  as: Tag = 'button',
  scale = PRESSED_SCALE,
  disabled = false,
  style,
  children,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...rest
}) {
  const [pressed, setPressed] = useState(false)
  // 눌렀다 뗀 직후 한 프레임 동안은 "되돌아오는 중"이라 트랜지션 곡선을 바꿔야 한다.
  const releasedRef = useRef(false)

  const press = useCallback(
    (e) => {
      if (disabled) return
      releasedRef.current = false
      setPressed(true)
      onPointerDown?.(e)
    },
    [disabled, onPointerDown],
  )

  const release = useCallback(
    (handler) => (e) => {
      releasedRef.current = true
      setPressed(false)
      handler?.(e)
    },
    [],
  )

  const pressStyle = {
    transform: pressed ? `scale(${scale})` : 'scale(1)',
    opacity: pressed ? PRESSED_OPACITY : 1,
    transition: pressed ? PRESS_IN_TRANSITION : PRESS_OUT_TRANSITION,
    // 합성 레이어로 올려 저사양 기기에서도 리페인트 없이 GPU가 처리하게 한다.
    willChange: 'transform',
    // 길게 눌렀을 때 브라우저 기본 하이라이트/선택이 뜨면 우리 피드백과 겹쳐 지저분해진다.
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    ...style,
  }

  return (
    <Tag
      // reduce-motion일 때 CSS가 트랜지션을 끄기 위한 훅(index.css의 .tds-pressable 규칙).
      className="tds-pressable"
      disabled={Tag === 'button' ? disabled : undefined}
      aria-disabled={Tag !== 'button' && disabled ? true : undefined}
      style={pressStyle}
      onPointerDown={press}
      onPointerUp={release(onPointerUp)}
      onPointerLeave={release(onPointerLeave)}
      onPointerCancel={release(onPointerCancel)}
      {...rest}
    >
      {children}
    </Tag>
  )
}
