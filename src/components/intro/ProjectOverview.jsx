export default function ProjectOverview({ content }) {
  return (
    <section className="hero-section" id="top">
      <p className="eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      <p>{content.body}</p>
    </section>
  )
}
