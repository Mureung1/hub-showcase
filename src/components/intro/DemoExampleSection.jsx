export default function DemoExampleSection({ content }) {
  return (
    <section className="intro-card demo-card">
      <h2>{content.title}</h2>
      <div className="demo-grid">
        <div>
          <h3>{content.inputTitle}</h3>
          <p>{content.input}</p>
        </div>
        <div>
          <h3>{content.outputTitle}</h3>
          <ul>
            {content.output.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
