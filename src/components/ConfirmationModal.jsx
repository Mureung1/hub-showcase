export default function ConfirmationModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <h2 id="confirmation-title">{title}</h2>
        <p>{message}</p>
        <div className="action-row">
          <button className="primary-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="ghost-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
