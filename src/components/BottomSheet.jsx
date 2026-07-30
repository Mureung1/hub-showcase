import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { colors, radius } from '../styles/theme.js'

// 지도 탭의 바텀시트. 3단 스냅(min/mid/max) + 드래그 + 최상단 제스처 락.
//
// 높이가 아니라 "이동"으로 구현한다 — 이 프로젝트는 리플로우를 유발하는 속성(height/width 등)을
// 애니메이션하지 않고 transform/opacity만 쓴다. 그래서 DOM 노드 높이는 항상 최대 높이로 고정해두고
// 접힘은 그만큼 아래로 translateY할 뿐이다(부모가 overflow:hidden이라 밀려난 부분은 가려진다).
//
// 예전엔 고정 640px + maxHeight:'92%'였는데, 그게 "위로 끝까지 안 올라가고 도로 내려오는" 증상의
// 원인이었다: 컨테이너 높이 H가 660px쯤인 흔한 폰에서 0.92H≈607 < 640이라 시트가 조용히 잘리고,
// 펼쳐도 컨테이너 상단에서 0.08H(≈53px) 아래에 멈춰 **구조적으로 상단에 닿을 수 없었다**. 접힘
// 오프셋도 고정값(310)이라 기기마다 접힘 높이가 흔들렸다(짧은 기기에선 150px, 더 짧으면 소멸).
// 이제 부모를 실제로 측정해 스냅 지점을 파생시킨다 — 어떤 기기에서도 min은 정확히 180px이고,
// max는 topInset(상단 오버레이가 차지하는 높이) 바로 아래에서 멈춘다.
const SNAP_MIN_HEIGHT = 180
const SNAP_MID_HEIGHT = 420
const SETTLE_TRANSITION = 'transform 280ms cubic-bezier(0.2, 0.9, 0.3, 1)'
// 이 이상 움직였으면 탭이 아니라 드래그로 본다(뗄 때 click이 따라오는 걸 막는 기준이기도 하다).
const TAP_SLOP_PX = 6
// 플릭 판정(px/ms) — 이보다 빠르면 가까운 스냅이 아니라 방향 쪽 다음 스냅으로 건너뛴다.
const FLICK_VELOCITY = 0.5

const SNAPS = ['min', 'mid', 'max']

function useContainerHeight(ref) {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent) return
    const measure = () => setHeight(parent.getBoundingClientRect().height)
    measure()
    // 부모는 top/bottom으로 늘어나는 fixed 박스라, 헤더 높이 변화(로그인 상태)·회전·주소창
    // 접힘까지 잡으려면 resize 이벤트만으로는 부족하다.
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [ref])
  return height
}

// footer: 스크롤 영역 밖에 고정으로 붙는 영역(지도 탭의 "두 곳 비교하기" 풀폭 버튼처럼, 목록을
// 스크롤해도 항상 눌려야 하는 액션). 생략하면 children이 시트 전체를 스크롤 영역으로 쓴다.
// topInset: 시트가 max일 때 위에 비워둘 높이 — 지도 상단 오버레이(세그먼트+칩)를 덮지 않기 위함.
export default function BottomSheet({ snap = 'min', onSnapChange, topInset = 0, footer, children }) {
  const rootRef = useRef(null)
  const scrollRef = useRef(null)
  const containerHeight = useContainerHeight(rootRef)

  const sheetHeight = Math.max(SNAP_MIN_HEIGHT, containerHeight - topInset)
  const offsetFor = useCallback(
    (name) => {
      if (name === 'max') return 0
      const visible = name === 'mid' ? SNAP_MID_HEIGHT : SNAP_MIN_HEIGHT
      return Math.max(0, sheetHeight - Math.min(visible, sheetHeight))
    },
    [sheetHeight],
  )

  // 드래그 중에만 숫자가 들어간다(그 동안은 transition을 끄고 손가락을 그대로 따라간다).
  const [dragOffset, setDragOffset] = useState(null)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)

  const settledOffset = offsetFor(snap)
  const offset = dragOffset ?? settledOffset

  const endDrag = useCallback(
    (clientY, timeStamp) => {
      const drag = dragRef.current
      dragRef.current = null
      setDragOffset(null)
      if (!drag) return

      const dy = clientY - drag.startY
      if (Math.abs(dy) <= TAP_SLOP_PX) return // 탭 — onClick이 처리한다

      // 드래그 직후 브라우저가 보내는 click 한 번을 삼킨다. **같은 이벤트 루프 턴 안에서만** 유효해야
      // 한다 — click은 pointerup 직후 같은 턴에 디스패치되므로 의도한 억제는 그대로 되고, 그 click이
      // 손잡이가 아닌 곳(콘텐츠 영역)으로 가서 cycleSnap이 안 불릴 때 플래그가 남는 누수만 사라진다.
      // 예전엔 cycleSnap만 플래그를 내려서, 목록을 끌어 시트를 움직인 뒤 손잡이를 누르면 그 탭이
      // 통째로 무시됐다("가끔 시트가 안 눌린다").
      suppressClickRef.current = true
      setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      const current = Math.min(Math.max(drag.startOffset + dy, 0), offsetFor('min'))
      const elapsed = Math.max(1, timeStamp - drag.startTime)
      const velocity = dy / elapsed

      let next
      if (Math.abs(velocity) > FLICK_VELOCITY) {
        // 플릭 — 아래로 빠르게 = 오프셋이 커지는 방향(min 쪽)으로 한 칸.
        const from = SNAPS.indexOf(drag.startSnap)
        const step = velocity > 0 ? -1 : 1
        next = SNAPS[Math.min(SNAPS.length - 1, Math.max(0, from + step))]
      } else {
        next = SNAPS.reduce((best, name) =>
          Math.abs(offsetFor(name) - current) < Math.abs(offsetFor(best) - current) ? name : best,
        )
      }
      if (next !== drag.startSnap) onSnapChange?.(next)
    },
    [offsetFor, onSnapChange],
  )

  // ⚠️ pointerdown 시점에 setPointerCapture를 하면 안 된다. 포인터가 이 컨테이너에 캡처되면
  // pointerup도 컨테이너로 가고, 브라우저는 click을 **눌린 버튼이 아니라 컨테이너**에 디스패치한다
  // — 시트 안의 모든 버튼("이 위치로 검색", 식당 카드, 비교하기…)이 통째로 죽는다. 실제로 그렇게
  // 죽었다. 그래서 여기서는 후보만 기록하고, 슬롭을 넘겨 **진짜 드래그가 된 순간에만** 캡처한다
  // (그 시점부터는 click이 안 나가는 게 오히려 맞다 — 드래그였지 탭이 아니므로).
  const startDrag = useCallback(
    (e) => {
      dragRef.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        startTime: e.timeStamp,
        startOffset: offsetFor(snap),
        startSnap: snap,
        captured: false,
      }
    },
    [offsetFor, snap],
  )

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const dy = e.clientY - drag.startY
      if (Math.abs(dy) <= TAP_SLOP_PX) return
      // max에서 목록을 위로 훑는 동작은 시트가 아니라 목록 스크롤이다 — 포인터를 가로채지 않고
      // 브라우저에 넘긴다(아래로 끄는 동작만 시트를 내린다).
      if (drag.downOnly && dy < 0) {
        dragRef.current = null
        setDragOffset(null)
        return
      }
      if (!drag.captured) {
        // 손가락이 요소 밖으로 나가도 이후 이벤트를 계속 받으려면 이 시점엔 캡처가 필요하다.
        e.currentTarget.setPointerCapture?.(e.pointerId)
        drag.captured = true
      }
      setDragOffset(Math.min(Math.max(drag.startOffset + dy, 0), offsetFor('min')))
    },
    [offsetFor],
  )

  const handlePointerUp = useCallback((e) => endDrag(e.clientY, e.timeStamp), [endDrag])

  // 제스처 락 — max에서는 시트가 아니라 안쪽 목록이 스크롤돼야 한다. 목록이 맨 위(scrollTop 0)일
  // 때만 여기서 시작한 드래그로 시트를 내릴 수 있다. max가 아닐 때는 목록이 짧아 스크롤할 게 없으니
  // 콘텐츠 어디를 잡아도 시트가 움직인다(지도 앱들의 일반적인 동작).
  const handleContentPointerDown = useCallback(
    (e) => {
      if (snap === 'max' && (scrollRef.current?.scrollTop ?? 0) > 0) return
      startDrag(e)
      // max이면서 목록이 맨 위일 때만 여기까지 오는데, 그 상태에서도 위로 훑는 건 스크롤이어야 한다.
      if (snap === 'max' && dragRef.current) dragRef.current.downOnly = true
    },
    [snap, startDrag],
  )

  const cycleSnap = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    const from = SNAPS.indexOf(snap)
    onSnapChange?.(SNAPS[(from + 1) % SNAPS.length])
  }, [snap, onSnapChange])

  const handleKeyDown = useCallback(
    (e) => {
      const from = SNAPS.indexOf(snap)
      if (e.key === 'ArrowUp' && from < SNAPS.length - 1) {
        e.preventDefault()
        onSnapChange?.(SNAPS[from + 1])
      } else if (e.key === 'ArrowDown' && from > 0) {
        e.preventDefault()
        onSnapChange?.(SNAPS[from - 1])
      }
    },
    [snap, onSnapChange],
  )

  // 스냅이 바뀌면(특히 max에서 내려오면) 목록 스크롤을 맨 위로 돌려놔야, 다음에 다시 내릴 때
  // scrollTop>0 때문에 제스처 락에 걸려 안 내려가는 상태가 생기지 않는다.
  useEffect(() => {
    if (snap !== 'max' && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [snap])

  const dragging = dragOffset !== null

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: sheetHeight,
        // 지도 위, 상단 오버레이(zIndex 2) 아래.
        zIndex: 1,
        transform: `translateY(${offset}px)`,
        transition: dragging ? 'none' : SETTLE_TRANSITION,
        willChange: 'transform',
        background: colors.surface,
        borderRadius: `${radius.lg}px ${radius.lg}px 0 0`,
        boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={cycleSnap}
        onKeyDown={handleKeyDown}
        onPointerDown={startDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-expanded={snap !== 'min'}
        aria-label={snap === 'max' ? '목록 접기' : '목록 펼치기'}
        className="tds-press"
        style={{
          flexShrink: 0,
          border: 'none',
          background: 'none',
          // 손잡이는 어떤 상태에서도 드래그를 브라우저에 뺏기면 안 된다.
          touchAction: 'none',
          padding: '10px 0 6px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <span aria-hidden="true" style={{ width: 44, height: 4, borderRadius: radius.pill, background: colors.border }} />
      </button>
      <div
        ref={scrollRef}
        className="tds-no-scrollbar"
        onPointerDown={handleContentPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          // max에서만 네이티브 세로 스크롤을 허용한다(그 외 스냅에선 시트 전체가 움직여야 한다).
          touchAction: snap === 'max' ? 'pan-y' : 'none',
          // 목록 끝에서 페이지로 스크롤이 전파되며 생기는 러버밴딩을 막는다.
          overscrollBehavior: 'contain',
        }}
      >
        {children}
      </div>
      {footer && <div style={{ flexShrink: 0, padding: '0 18px 16px' }}>{footer}</div>}
    </div>
  )
}
