export default function ErrorMessage({ error }) {
  if (!error) {
    return null
  }

  return (
    <div className="error-message" role="alert">
      <strong>{error.title}</strong>
      <p>{error.message}</p>
    </div>
  )
}
