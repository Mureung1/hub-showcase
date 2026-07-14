export default function SentenceAccordion({ sentence }) {
  return (
    <details className="sentence-accordion">
      <summary>{sentence.text}</summary>
      <div className="sentence-translation">
        <p>{sentence.translation}</p>
      </div>
    </details>
  )
}
