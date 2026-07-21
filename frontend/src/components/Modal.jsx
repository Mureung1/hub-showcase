import { useEffect } from 'react'
import './Modal.css'

// 글래스 오버레이 모달. 튜토리얼/비밀번호 입력 등에서 공용으로 쓴다.
// ESC 또는 배경 클릭으로 닫힌다. onClose 를 안 주면 닫기 불가(강제 단계).
function Modal({ title, children, onClose, labelledBy = 'rs-modal-title' }) {
  useEffect(() => {
    if (!onClose) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="rs-modal-backdrop" onClick={onClose ? () => onClose() : undefined}>
      <div
        className="rs-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="rs-modal-head">
            {title && (
              <h2 id={labelledBy} className="rs-modal-title">
                {title}
              </h2>
            )}
            {onClose && (
              <button className="rs-modal-close" onClick={onClose} aria-label="닫기">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="rs-modal-body">{children}</div>
      </div>
    </div>
  )
}

export default Modal
