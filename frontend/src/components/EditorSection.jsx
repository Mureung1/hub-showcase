import CommentItem from './CommentItem.jsx'

function EditorSection({ section, guide, aiComments, onChange, onRemove }) {
  return (
    <div className="rs-panel rs-editor-section">
      <div className="rs-editor-section-main">
        <div className="rs-editor-section-head">
          <input
            className="rs-editor-heading"
            value={section.heading}
            onChange={(e) => onChange({ heading: e.target.value })}
            aria-label="섹션 제목"
          />
          <button type="button" className="rs-chip" onClick={onRemove}>
            섹션 삭제
          </button>
        </div>
        <textarea
          value={section.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder={guide.guide}
          rows={6}
        />
        {aiComments.map((content, i) => (
          <CommentItem
            key={`${section.id}-ai-${i}`}
            comment={{ isAi: true, content, createdAt: null }}
          />
        ))}
      </div>
      <aside className="rs-editor-guide">
        <h3>이 섹션에서 다뤄야 할 것</h3>
        <p>{guide.guide}</p>
        {guide.example && (
          <>
            <h3>잘 쓴 예시</h3>
            <p className="rs-editor-guide-example">{guide.example}</p>
          </>
        )}
      </aside>
    </div>
  )
}

export default EditorSection
