import { useState } from 'react'

// 입력 중인 텍스트는 이 컴포넌트 밖에서 쓸 일이 없어서
// 페이지로 끌어올리지 않고 지역 state로 가둔다
function CommentForm({ onSubmit, onCancel }) {
  const [text, setText] = useState('')

  function handleSubmit() {
    if (text.trim() === '') return
    onSubmit(text.trim())
    setText('')
  }

  return (
    <div className="rs-comment-form">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="이 섹션에 대한 피드백을 남겨보세요 — 문서 전체가 아니라 섹션 단위라서 더 구체적일 수 있어요."
        rows={3}
      />
      <div className="rs-comment-form-actions">
        <button type="button" className="rs-btn rs-btn-primary" onClick={handleSubmit}>
          코멘트 등록
        </button>
        <button type="button" className="rs-btn" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  )
}

export default CommentForm
