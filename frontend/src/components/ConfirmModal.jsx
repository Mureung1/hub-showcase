import './ConfirmModal.css'

// 제목/본문 텍스트를 props로 받는 범용 확인 팝업. 특정 화면에 종속된 로직은 넣지 않는다.
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = '예',
  cancelLabel = '아니오',
  onConfirm,
  onCancel,
  isConfirmLoading = false,
  errorMessage = '',
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="confirm-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="confirm-modal-title" id="confirm-modal-title">
          {title}
        </h2>

        {message && <p className="confirm-modal-message">{message}</p>}

        {errorMessage && <p className="confirm-modal-error">{errorMessage}</p>}

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-button confirm-modal-button-cancel"
            onClick={onCancel}
            disabled={isConfirmLoading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-modal-button confirm-modal-button-confirm"
            onClick={onConfirm}
            disabled={isConfirmLoading}
          >
            {isConfirmLoading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
