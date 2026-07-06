function titleFieldLabel(type, copy) {
  if (type === 'requirement') {
    return copy.requirement
  }

  if (type === 'caution') {
    return copy.caution
  }

  return copy.title
}

export default function EditableItemCard({
  copy,
  item,
  type,
  typeLabel,
  onUpdate,
  onDelete,
  onShowEvidence,
}) {
  const primaryField = 'text' in item ? 'text' : 'title'

  return (
    <article className="item-card">
      <div className="item-card-header">
        <span className="type-pill">{typeLabel || type}</span>
        <div className="item-card-actions">
          <button type="button" onClick={() => onShowEvidence(item)}>
            {copy.evidence}
          </button>
          <button type="button" onClick={() => onDelete(item.id)}>
            {copy.delete}
          </button>
        </div>
      </div>

      {'completed' in item ? (
        <label className="inline-check">
          <input
            type="checkbox"
            checked={item.completed}
            onChange={(event) => onUpdate(item.id, { completed: event.target.checked })}
          />
          <span>{copy.taskComplete}</span>
        </label>
      ) : null}

      {'selected' in item ? (
        <label className="inline-check">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={(event) => onUpdate(item.id, { selected: event.target.checked })}
          />
          <span>{copy.selectForCalendar}</span>
        </label>
      ) : null}

      <label className="compact-field">
        <span>{titleFieldLabel(type, copy)}</span>
        <input
          type="text"
          value={item[primaryField]}
          onChange={(event) =>
            onUpdate(item.id, { [primaryField]: event.target.value })
          }
        />
      </label>

      {'date' in item ? (
        <div className="field-pair">
          <label className="compact-field">
            <span>{copy.date}</span>
            <input
              type="date"
              value={item.date}
              onChange={(event) => onUpdate(item.id, { date: event.target.value })}
            />
          </label>
          <label className="compact-field">
            <span>{copy.time}</span>
            <input
              type="time"
              value={item.time}
              onChange={(event) => onUpdate(item.id, { time: event.target.value })}
            />
          </label>
        </div>
      ) : null}

      {'dueDate' in item ? (
        <label className="compact-field">
          <span>{copy.dueDate}</span>
          <input
            type="date"
            value={item.dueDate}
            onChange={(event) => onUpdate(item.id, { dueDate: event.target.value })}
          />
        </label>
      ) : null}

      {'startDate' in item ? (
        <>
          <div className="field-pair">
            <label className="compact-field">
              <span>{copy.startDate}</span>
              <input
                type="date"
                value={item.startDate}
                onChange={(event) =>
                  onUpdate(item.id, { startDate: event.target.value })
                }
              />
            </label>
            <label className="compact-field">
              <span>{copy.time}</span>
              <input
                type="time"
                value={item.time}
                onChange={(event) => onUpdate(item.id, { time: event.target.value })}
              />
            </label>
          </div>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={item.allDay}
              onChange={(event) => onUpdate(item.id, { allDay: event.target.checked })}
            />
            <span>{copy.allDay}</span>
          </label>
        </>
      ) : null}

      {'description' in item ? (
        <label className="compact-field">
          <span>{copy.description}</span>
          <textarea
            value={item.description}
            onChange={(event) =>
              onUpdate(item.id, { description: event.target.value })
            }
            rows={3}
          />
        </label>
      ) : null}
    </article>
  )
}
