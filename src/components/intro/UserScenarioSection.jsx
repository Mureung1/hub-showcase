export default function UserScenarioSection({ content }) {
  return (
    <section className="intro-card">
      <h2>{content.title}</h2>
      <div className="two-column-list">
        {content.items.map((useCase) => (
          <p key={useCase}>{useCase}</p>
        ))}
      </div>
    </section>
  )
}
