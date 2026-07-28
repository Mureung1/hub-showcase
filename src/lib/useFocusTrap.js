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
        onEscape?.()
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
  }, [active, onEscape])

  return containerRef
}
