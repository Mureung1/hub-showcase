import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { slotKey, type ScheduleSlot } from 'shared'
import { formatDateLabel } from '../lib/formatDateLabel.ts'
import './ScheduleGrid.css'

type ScheduleGridProps = {
  slots: ScheduleSlot[]
  selectedKeys: Set<string>
  variant: 'available' | 'preferred'
  onToggle: (slot: ScheduleSlot) => void
  // claude: 지정하지 않으면 slots 전부 클릭 가능(1단계). 지정하면 이 키에 없는 슬롯은 회색으로 비활성화(2단계 — 1단계에서 고르지 않은 칸은 선호로 못 고르게).
  eligibleKeys?: Set<string>
}

const LONG_PRESS_MS = 300
// claude: 롱프레스 대기 중 이 거리(px) 이상 움직이면 드래그 선택이 아니라 스크롤 등 다른 제스처로 보고 취소한다.
const MOVE_CANCEL_PX = 10

function ScheduleGrid({ slots, selectedKeys, variant, onToggle, eligibleKeys }: ScheduleGridProps) {
  const dates = [...new Set(slots.map((slot) => slot.date))].sort() // study: slot에서 날짜 뽑아내는데, 시간은 다르지만 날짜는 같은 slot들 때문에 중복이 나올 것이라, set으로 중복 제거, 이후 배열로 만들고 정렬. 이때 날짜/시간 문자열은 항상 형식이 맞춰져 있으므로, 시간 순으로 정렬됨.
  const times = [...new Set(slots.map((slot) => slot.time))].sort()
  const slotMap = new Map(slots.map((slot) => [slotKey(slot), slot])) // study: key = 문자열, value = {date:"2026-07-20", time:"09:00"} 같은 객체

  // claude: 꾹 눌러서(300ms) 드래그하면 지나가는 여러 칸을 한 번에 선택/해제하는 기능. 아래 gesture는 렌더마다
  // 최신값(slotMap/eligibleKeys/selectedKeys/onToggle)으로 갱신되는 "제스처 진행 상태" 저장소이고, handlers는
  // document에 addEventListener/removeEventListener할 때 항상 같은 함수를 등록/해제해야 해서(안 그러면 리스너가
  // 안 지워지고 계속 쌓인다) 최초 렌더에서 한 번만 만들어 재사용한다 - handlers 안의 함수들은 gesture.current를
  // 통해서만 값을 읽고 쓰므로, 매 렌더 새로 만들어지지 않아도 항상 최신 상태로 동작한다.
  const gesture = useRef({
    pressTimer: null as number | null,
    dragging: false,
    startPoint: null as { x: number; y: number } | null,
    targetSelected: false,
    visited: new Set<string>(),
    ignoreNextClick: false,
    slotMap,
    eligibleKeys,
    selectedKeys,
    onToggle,
  })
  gesture.current.slotMap = slotMap
  gesture.current.eligibleKeys = eligibleKeys
  gesture.current.selectedKeys = selectedKeys
  gesture.current.onToggle = onToggle

  const handlers = useRef({
    // claude: 제스처당 칸 하나는 정확히 한 번만 처리 - 목표 상태(targetSelected)와 다를 때만 onToggle을 불러서
    // 왔다갔다 지나가도 깜빡이지 않게 한다.
    applyToCell(key: string) {
      const g = gesture.current
      if (g.visited.has(key)) return
      g.visited.add(key)

      const slot = g.slotMap.get(key)
      if (!slot) return
      const eligible = !g.eligibleKeys || g.eligibleKeys.has(key)
      if (!eligible) return

      if (g.selectedKeys.has(key) !== g.targetSelected) g.onToggle(slot)
    },
    cleanup() {
      const g = gesture.current
      if (g.pressTimer !== null) {
        window.clearTimeout(g.pressTimer)
        g.pressTimer = null
      }
      g.dragging = false
      document.removeEventListener('pointermove', handlers.current.onDocumentPointerMove)
      document.removeEventListener('pointerup', handlers.current.onDocumentPointerUp)
      document.removeEventListener('pointercancel', handlers.current.onDocumentPointerUp)
      document.removeEventListener('touchmove', handlers.current.onDocumentTouchMove)
    },
    // claude: touch-action: pan-y라 롱프레스 확정 전(dragging=false)엔 손대지 않고 그대로 두면 브라우저가
    // 스크롤을 100% 네이티브로 처리한다. 롱프레스가 확정된 순간엔 아직 손가락이 안 움직인 상태(가만히 있었으니
    // 롱프레스가 됨)라 브라우저가 스크롤을 시작도 안 했고, 그래서 그 다음 첫 touchmove에서 preventDefault를
    // 부르면 스크롤 자체가 시작되지 못하게 막을 수 있다 - scrollBy 등으로 우리가 스크롤 값을 직접 계산하는
    // 코드가 전혀 없으므로 네이티브 스크롤과 값을 두고 다툴 일이 없다(Pointer Events의 preventDefault는 터치
    // 기본 동작 취소에 신뢰도가 낮다고 알려져 있어, 원조 Touch Events에 별도로 등록).
    onDocumentTouchMove(event: TouchEvent) {
      if (gesture.current.dragging) event.preventDefault()
    },
    onDocumentPointerMove(event: PointerEvent) {
      const g = gesture.current
      if (g.dragging) {
        const el = document.elementFromPoint(event.clientX, event.clientY)
        const key = el?.getAttribute('data-slot-key')
        if (key) handlers.current.applyToCell(key)
        return
      }
      if (!g.startPoint) return
      const dx = event.clientX - g.startPoint.x
      const dy = event.clientY - g.startPoint.y
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) handlers.current.cleanup()
    },
    onDocumentPointerUp() {
      const g = gesture.current
      // claude: 드래그가 실제로 있었으면(꾹 눌러서 진입) 뒤이어 오는 click 이벤트 1회를 무시해야
      // 포인터를 뗀 칸이 고스트 클릭으로 한 번 더 토글되지 않는다. 단, pointerdown/pointerup이 서로 다른 칸에서
      // 일어난 드래그는 브라우저가 애초에 click을 아예 안 쏘기도 해서(같은 엘리먼트에서 눌렀다 뗐을 때만 click이
      // 발생) 그럴 땐 이 플래그를 소비할 click이 영영 안 와 다음 번 진짜 클릭을 대신 먹어버리는 문제가 있었다 -
      // 이번 이벤트 루프 틱 안에서만 유효하도록 짧게 리셋해서, 같은 칸에서 끝난 진짜 고스트 클릭만 정확히 막는다.
      if (g.dragging) {
        g.ignoreNextClick = true
        window.setTimeout(() => {
          g.ignoreNextClick = false
        }, 0)
      }
      handlers.current.cleanup()
    },
  })

  // claude: 드래그 도중 컴포넌트가 사라지는 경우(예: 페이지 이동)를 대비해 언마운트 시 리스너/타이머를 정리한다.
  useEffect(() => () => handlers.current.cleanup(), [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, key: string) => {
    const g = gesture.current
    g.startPoint = { x: event.clientX, y: event.clientY }
    g.visited = new Set()

    document.addEventListener('pointermove', handlers.current.onDocumentPointerMove)
    document.addEventListener('pointerup', handlers.current.onDocumentPointerUp)
    document.addEventListener('pointercancel', handlers.current.onDocumentPointerUp)
    // claude: passive: false로 등록해야 preventDefault()가 실제로 먹는다(기본값 passive면 무시됨).
    document.addEventListener('touchmove', handlers.current.onDocumentTouchMove, { passive: false })

    g.pressTimer = window.setTimeout(() => {
      g.pressTimer = null
      g.dragging = true
      const eligible = !g.eligibleKeys || g.eligibleKeys.has(key)
      g.targetSelected = eligible ? !g.selectedKeys.has(key) : false
      handlers.current.applyToCell(key)
    }, LONG_PRESS_MS)
  }

  const handleClick = (slot: ScheduleSlot) => {
    const g = gesture.current
    if (g.ignoreNextClick) {
      g.ignoreNextClick = false
      return
    }
    g.onToggle(slot)
  }

  return (
    <div className="schedule-grid-wrapper">
      <table className="schedule-grid">
        <thead>
          <tr>
            <th className="schedule-grid__corner" />
            {dates.map((date) => {
              const label = formatDateLabel(date) // claude: "7/21(화)" 형태 - 좁은 칸에서 겹치지 않도록 괄호 앞에서 두 줄로 나눠 렌더링.
              const weekdayIndex = label.indexOf('(')
              return (
                <th key={date}>
                  <span className="schedule-grid__date">{label.slice(0, weekdayIndex)}</span>
                  <span className="schedule-grid__weekday">{label.slice(weekdayIndex)}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => (
            <tr key={time}>
              <th scope="row">{time}</th>
              {dates.map((date) => {
                const key = `${date}T${time}`
                const slot = slotMap.get(key)
                if (!slot) return <td key={date} />

                const eligible = !eligibleKeys || eligibleKeys.has(key)
                const selected = eligible && selectedKeys.has(key)
                // claude: 2단계(preferred)에서 "가능하지만 아직 선호로 선택 안 한" 칸은 회색이 아니라
                // 1단계에서 칠했던 연한 파랑(available 스타일)을 그대로 유지 - 선택하면 진한 파랑(preferred)으로 전환.
                const modifier = selected ? variant : variant === 'preferred' && eligible ? 'available' : ''
                return (
                  <td key={date}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      disabled={!eligible}
                      data-slot-key={key}
                      className={`schedule-cell${modifier ? ` schedule-cell--${modifier}` : ''}`}
                      onPointerDown={(event) => handlePointerDown(event, key)}
                      onClick={() => handleClick(slot)}
                      // claude: CSS(user-select/-webkit-touch-callout)만으론 최신 iOS Safari 일부 버전에서
                      // 롱프레스 콜아웃(복사/선택 팝업)이 여전히 뜨는 사례가 보고돼 있어, contextmenu 이벤트
                      // 자체를 막는 방어선을 하나 더 둔다.
                      onContextMenu={(event) => event.preventDefault()}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ScheduleGrid
