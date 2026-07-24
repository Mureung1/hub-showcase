export default function PageHeader({ title, eyebrow }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="section-title">{title}</h1>
      </div>
    </div>
  )
}
