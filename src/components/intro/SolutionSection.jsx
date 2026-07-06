export default function SolutionSection({ content }) {
  return (
    <section className="intro-card">
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <div className="flow-line">
        {content.flow.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
    </section>
  )
}
