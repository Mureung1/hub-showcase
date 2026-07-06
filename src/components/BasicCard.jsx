export default function BasicCard({ title, description }) {
  return (
    <article className="basic-card">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </article>
  )
}
