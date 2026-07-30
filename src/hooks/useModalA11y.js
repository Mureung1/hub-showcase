import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// JobDetailModal/InsightModal/ReferenceLinksModal이 공유하는 모달 키보드 접근성 (#18):
// ESC로 닫기, 열릴 때 포커스를 모달 안으로 이동, Tab이 모달 밖으로 나가지 않게 트랩,
// 닫히면 모달을 열기 전 포커스였던 요소로 되돌린다.
export function useModalA11y(isOpen, onClose) {
  const boxRef = useRef(null)
  // 호출부(ResultPage 등)가 onClose로 매번 새 인라인 함수를 넘기는 경우가 많다 — effect의 의존성 배열에
  // onClose를 직접 넣으면 그 함수 참조가 바뀔 때마다(모달 안에서 북마크 토글 등으로 부모가 리렌더될 때마다)
  // 트랩이 통째로 재설정되면서 사용자가 Tab으로 이동해둔 포커스가 매번 리셋되는 버그가 있었다.
  // ref로 최신 onClose만 추적해서 effect 자체는 isOpen에만 반응하도록 분리한다.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement
    const box = boxRef.current
    const focusable = box ? Array.from(box.querySelectorAll(FOCUSABLE_SELECTOR)) : []
    ;(focusable[0] ?? box)?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCloseRef.current()
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
  }, [isOpen])

  return boxRef
}
