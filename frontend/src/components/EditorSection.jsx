import CommentItem from './CommentItem.jsx'

// 섹션 편집. 템플릿이 짧은 필드(fields)를 주면 라벨 붙은 작은 입력들로,
// 아니면(자유 양식·사용자 추가 섹션) 예전처럼 큰 textarea 하나로 렌더한다.
function EditorSection({ section, guide, aiComments, onChange, onFieldChange, onRemove }) {
  // 필드 스펙(placeholder·long)은 템플릿(guide.fields)에서, 값은 섹션 인스턴스(section.fields)에서.
  const specByKey = new Map((guide.fields ?? []).map((f) => [f.key, f]))
  const hasFields = Array.isArray(section.fields) && section.fields.length > 0

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

        {hasFields ? (
          <div className="rs-editor-fields">
            {section.fields.map((field) => {
              const spec = specByKey.get(field.key) ?? {}
              return (
                <label key={field.key} className="rs-editor-field">
                  <span className="rs-editor-field-label">{field.label}</span>
                  {spec.long ? (
                    <textarea
                      value={field.value}
                      onChange={(e) => onFieldChange(field.key, e.target.value)}
                      placeholder={spec.placeholder}
                      rows={3}
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => onFieldChange(field.key, e.target.value)}
                      placeholder={spec.placeholder}
                    />
                  )}
                </label>
              )
            })}
          </div>
        ) : (
          <textarea
            value={section.content ?? ''}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder={guide.guide}
            rows={6}
          />
        )}

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
