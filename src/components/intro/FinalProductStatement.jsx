export default function FinalProductStatement({ content }) {
  return (
    <section className="final-statement">
      <h2>{content.title}</h2>
      <p>{content.body}</p>
    </section>
  )
}
