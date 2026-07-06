export default function NoticeInput({
  copy,
  noticeTitle,
  sourceText,
  onTitleChange,
  onSourceTextChange,
  onAnalyzeMock,
  onClear,
}) {
  return (
    <section className="tool-panel">
      <div className="section-heading">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <label className="field">
        <span>{copy.titleLabel}</span>
        <input
          type="text"
          value={noticeTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={copy.titlePlaceholder}
        />
      </label>

      <label className="field">
        <span>{copy.textLabel}</span>
        <textarea
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          placeholder={copy.textPlaceholder}
          rows={9}
        />
      </label>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={onAnalyzeMock}>
          {copy.analyzeButton}
        </button>
        <button className="ghost-button" type="button" onClick={onClear}>
          {copy.clearButton}
        </button>
      </div>
    </section>
  )
}
