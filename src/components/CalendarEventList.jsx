import EditableItemCard from './EditableItemCard.jsx'

export default function CalendarEventList({
  title,
  typeLabel,
  cardCopy,
  items,
  onUpdate,
  onDelete,
  onShowEvidence,
}) {
  return (
    <section className="result-section result-section-wide">
      <h3>{title}</h3>
      {items.map((item) => (
        <EditableItemCard
          key={item.id}
          copy={cardCopy}
          item={item}
          type="calendar event"
          typeLabel={typeLabel}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onShowEvidence={onShowEvidence}
        />
      ))}
    </section>
  )
}
