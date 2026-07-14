function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      <p className="empty-desc">{description}</p>
      {actionLabel && (
        <button className="btn-secondary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState
