import CommentItem from './CommentItem.jsx'
import CommentForm from './CommentForm.jsx'

function DocumentSection({
  section,
  comments,
  isFormOpen,
  onOpenForm,
  onSubmitComment,
  onCancelForm,
}) {
  // 구조화 섹션(fields)은 라벨/값 목록으로, 레거시 섹션은 문단 하나로 렌더한다.
  const filledFields = (section.fields ?? []).filter((f) => (f.value ?? '').trim() !== '')

  return (
    <section className="rs-panel rs-doc-section">
      <h2>{section.heading}</h2>
      {filledFields.length > 0 ? (
        <dl className="rs-doc-fields">
          {filledFields.map((f) => (
            <div key={f.key} className="rs-doc-field">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="rs-doc-section-body">{section.content}</p>
      )}

      <div className="rs-section-comments">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
        {isFormOpen ? (
          <CommentForm onSubmit={onSubmitComment} onCancel={onCancelForm} />
        ) : (
          <button type="button" className="rs-chip rs-comment-open" onClick={onOpenForm}>
            + 이 섹션에 코멘트
          </button>
        )}
      </div>
    </section>
  )
}

export default DocumentSection
