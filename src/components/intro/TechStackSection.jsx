export default function TechStackSection({ content }) {
  return (
    <section className="intro-card">
      <h2>{content.title}</h2>
      <ul className="feature-grid">
        {content.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="callout">{content.note}</p>
    </section>
  )
}
