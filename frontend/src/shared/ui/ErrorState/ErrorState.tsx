type ErrorStateProps = {
  message: string
  onRetry: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert">
      <p>{message}</p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  )
}
