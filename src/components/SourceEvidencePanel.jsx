export default function SourceEvidencePanel({ copy, evidence }) {
  return (
    <section className="side-panel">
      <div className="section-heading compact">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
      </div>

      {evidence ? (
        <div className="evidence-box">
          <span className="type-pill">{evidence.type}</span>
          <h3>{evidence.item.title || evidence.item.text}</h3>
          <blockquote>{evidence.item.evidence || copy.fallback}</blockquote>
        </div>
      ) : (
        <p className="muted">{copy.empty}</p>
      )}
    </section>
  )
}
