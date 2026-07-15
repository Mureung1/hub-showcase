function SummaryCard({ icon, title, value, onChange }) {
  return (
    <label className="summary-card">
      <span className="summary-title"><span aria-hidden="true">{icon}</span>{title}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={title}
      />
    </label>
  )
}

export default SummaryCard
