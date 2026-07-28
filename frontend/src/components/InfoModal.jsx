import './InfoModal.css'

// 확인/취소 선택이 필요 없는 단순 안내 팝업(성공/실패/안내 메시지 전용). ConfirmModal과 톤은 맞추되 버튼은 하나만 둔다.
export default function InfoModal({ isOpen, title, message, confirmLabel = '확인', onConfirm }) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="info-modal-overlay" role="presentation" onClick={onConfirm}>
      <div
        className="info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="info-modal-title" id="info-modal-title">
          {title}
        </h2>

        {message && <p className="info-modal-message">{message}</p>}

        <button type="button" className="info-modal-button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
