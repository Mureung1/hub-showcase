export default function ProblemSection({ content }) {
  return (
    <section className="intro-card">
      <h2>{content.title}</h2>
      <p>{content.body}</p>
      <ul className="chip-list">
        {content.cards.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </section>
  )
}
