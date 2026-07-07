export default function WarningBanner({ title, warnings }) {
  if (!warnings?.length) {
    return null
  }

  return (
    <div className="warning-banner" role="status" aria-live="polite">
      <strong>{title}</strong>
      <ul>
        {warnings.map((warning) => (
          <li key={`${warning.type}-${warning.message}`}>{warning.message}</li>
        ))}
      </ul>
    </div>
  )
}
