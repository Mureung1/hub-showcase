import { useState } from "react"

export default function TermTooltip({ term, metaphor, definition }) {
  const [open, setOpen] = useState(false)

  return (
    <button
      type="button"
      className="term"
      onClick={() => setOpen((prev) => !prev)}
      onBlur={() => setOpen(false)}
    >
      {term}
      {open && (
        <span className="tooltip">
          <span className="metaphor">{metaphor}</span>
          <span className="definition">{definition}</span>
        </span>
      )}
    </button>
  )
}
