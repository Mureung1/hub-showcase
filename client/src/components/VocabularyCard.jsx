import { useState } from "react"

export default function VocabularyCard({ item, onDelete }) {
  const [flipped, setFlipped] = useState(false)

  function toggleFlip() {
    setFlipped((prev) => !prev)
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleFlip()
    }
  }

  function handleDeleteClick(e) {
    e.stopPropagation()
    onDelete?.()
  }

  return (
    <div
      className={`vocabulary-card${flipped ? " flipped" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
    >
      <div className="vocabulary-card-inner">
        <div className="vocabulary-card-face vocabulary-card-front">
          <button type="button" className="vocabulary-card-delete" onClick={handleDeleteClick}>
            삭제
          </button>
          <h2 className="vocabulary-term">{item.term}</h2>
          <p className="vocabulary-definition">{item.definition}</p>
        </div>
        <div className="vocabulary-card-face vocabulary-card-back">
          <p className="vocabulary-excerpt">{item.excerpt ?? "저장된 원문 발췌가 없어요."}</p>
          {item.excerptTranslation && (
            <p className="vocabulary-excerpt-translation">{item.excerptTranslation}</p>
          )}
        </div>
      </div>
    </div>
  )
}
