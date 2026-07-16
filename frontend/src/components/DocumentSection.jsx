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
  return (
    <section className="rs-panel rs-doc-section">
      <h2>{section.heading}</h2>
      <p className="rs-doc-section-body">{section.content}</p>

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
