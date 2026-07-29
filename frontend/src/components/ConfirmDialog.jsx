import './ConfirmDialog.css'

const ConfirmDialog = ({
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  errorMessage,
  hideCancel = false,
}) => {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog-message">{message}</p>
        {errorMessage && <p className="confirm-dialog-error">{errorMessage}</p>}
        <div className="confirm-dialog-actions">
          {!hideCancel && (
            <button type="button" className="btn-outline" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button type="button" className="btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
