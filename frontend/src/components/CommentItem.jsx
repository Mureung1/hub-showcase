import './components.css'

function CommentItem({ comment }) {
  return (
    <div className={`rs-comment${comment.isAi ? ' is-ai' : ''}`}>
      <div className="rs-comment-head">
        {comment.isAi ? (
          <span className="rs-comment-ai-badge">AI 피드백</span>
        ) : (
          <span className="rs-comment-author">{comment.author}</span>
        )}
        {comment.createdAt && <span className="rs-comment-date">{comment.createdAt}</span>}
      </div>
      <p className="rs-comment-body">{comment.content}</p>
      {comment.isAi && (
        <p className="rs-comment-caption">
          AI 피드백은 구조·서술 관점의 참고용이며, 게임에 대한 사실관계는 틀릴 수 있어요.
        </p>
      )}
    </div>
  )
}

export default CommentItem
