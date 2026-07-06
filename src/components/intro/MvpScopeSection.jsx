function ScopeColumn({ title, items }) {
  return (
    <div className="scope-column">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default function MvpScopeSection({ content }) {
  return (
    <section className="intro-card">
      <h2>{content.title}</h2>
      <div className="scope-grid">
        {content.columns.map((column) => (
          <ScopeColumn key={column.title} title={column.title} items={column.items} />
        ))}
      </div>
    </section>
  )
}
