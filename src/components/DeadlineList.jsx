import EditableItemCard from './EditableItemCard.jsx'

export default function DeadlineList({
  title,
  typeLabel,
  cardCopy,
  items,
  onUpdate,
  onDelete,
  onShowEvidence,
}) {
  return (
    <section className="result-section">
      <h3>{title}</h3>
      {items.map((item) => (
        <EditableItemCard
          key={item.id}
          copy={cardCopy}
          item={item}
          type="deadline"
          typeLabel={typeLabel}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onShowEvidence={onShowEvidence}
        />
      ))}
    </section>
  )
}
