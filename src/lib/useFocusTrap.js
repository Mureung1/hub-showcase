import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 모달/시트 공용 포커스 트랩 — GuestMigrationPrompt/ImportConflictDialog/ConfirmDialog가 공유한다.
// active인 동안: 마운트 시 컨테이너 안 첫 포커스 가능한 요소로 포커스를 옮기고, Tab/Shift+Tab이
// 컨테이너 밖으로 나가지 않게 순환시키며, Escape는 onEscape를 부른다(busy 중이면 호출부가 undefined를
// 넘겨 막는다). 언마운트/비활성화 시 포커스를 모달을 열기 전 요소로 되돌려, 스크린리더 사용자가
// 닫힌 모달 뒤에 남겨지지 않게 한다.
export function useFocusTrap(active, onEscape) {
  const containerRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  // onEscape가 호출부에서 매 렌더 새 함수로 넘어와도(예: 인라인 화살표) 아래 트랩 설정 effect가
  // 그 참조 변화만으로 재실행되지 않도록 ref에 최신값만 담아둔다. 안정성 점검 — 예전엔 onEscape가
  // 아래 effect의 의존성에 직접 있어서, 컨트롤드 input을 가진 모달(ChatBotSheet)에서 타이핑할
  // 때마다(리렌더 -> onEscape 참조 변경) 트랩이 매번 재설정되며 강제 blur/focus를 일으켰고, 그
  // blur가 한글 IME 조합을 중간에 커밋시켜 종성이 분리되는 버그(예: "안녕"->"아ㄴ녀ㅇ")로 이어졌다.
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    if (!active) return undefined
    const container = containerRef.current
    if (!container) return undefined

    previouslyFocusedRef.current = document.activeElement

    const focusables = () => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
    const first = focusables()[0]
    ;(first ?? container).focus?.()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onEscapeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedRef.current?.focus?.()
    }
  }, [active])

  return containerRef
}
