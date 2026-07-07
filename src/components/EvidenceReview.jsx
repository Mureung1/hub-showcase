const sectionOrder = [
  'deadlines',
  'tasks',
  'submissions',
  'requirements',
  'cautions',
  'calendarEvents',
]

function itemLabel(item) {
  return item.title || item.text || item.id
}

export default function EvidenceReview({ analysisResult, collectionLabels, copy }) {
  return (
    <section className="evidence-review">
      <h3>{copy.title}</h3>
      <div className="evidence-review-list">
        {sectionOrder.flatMap((sectionName) =>
          analysisResult[sectionName].map((item) => (
            <article className="evidence-review-item" key={`${sectionName}-${item.id}`}>
              <span className="type-pill">{collectionLabels[sectionName]}</span>
              <strong>{itemLabel(item)}</strong>
              <blockquote>{item.evidence || copy.fallback}</blockquote>
            </article>
          )),
        )}
      </div>
    </section>
  )
}
