import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// JobDetailModal/InsightModal/ReferenceLinksModal이 공유하는 모달 키보드 접근성 (#18):
// ESC로 닫기, 열릴 때 포커스를 모달 안으로 이동, Tab이 모달 밖으로 나가지 않게 트랩,
// 닫히면 모달을 열기 전 포커스였던 요소로 되돌린다.
export function useModalA11y(isOpen, onClose) {
  const boxRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement
    const box = boxRef.current
    const focusable = box ? Array.from(box.querySelectorAll(FOCUSABLE_SELECTOR)) : []
    ;(focusable[0] ?? box)?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [isOpen, onClose])

  return boxRef
}
