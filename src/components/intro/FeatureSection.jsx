export default function FeatureSection({ content }) {
  return (
    <section className="intro-card">
      <h2>{content.title}</h2>
      <ul className="feature-grid">
        {content.items.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </section>
  )
}
