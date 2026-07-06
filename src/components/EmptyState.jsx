export default function EmptyState({ copy }) {
  return (
    <section className="empty-state">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
    </section>
  )
}
