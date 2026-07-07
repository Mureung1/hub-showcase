import './CardSection.css'

function CardSection({ heading, items, id, tone }) {
  const sectionClass = tone ? `card-section card-section--${tone}` : 'card-section'

  return (
    <section className={sectionClass} id={id}>
      <h2>{heading}</h2>
      <div className="card-grid">
        {items.map((item) => (
          <article className="card" key={item.title}>
            <span className="card-icon" aria-hidden="true">
              {item.icon}
            </span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default CardSection
