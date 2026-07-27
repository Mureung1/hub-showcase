import { useEffect, useState } from 'react'
import './InviteCodeModal.css'

// 친구 코드를 입력받아 부모가 넘겨준 onSubmit(code)을 호출하는 모달. 성공/실패 처리는 부모가 담당한다.
export default function InviteCodeModal({ isOpen, onClose, onSubmit, isSubmitting, errorMessage }) {
  const [code, setCode] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCode('')
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!code.trim() || isSubmitting) {
      return
    }
    onSubmit(code.trim())
  }

  return (
    <div className="invite-code-modal-overlay" role="presentation" onClick={onClose}>
      <form
        className="invite-code-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className="invite-code-modal-close"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="닫기"
        >
          &times;
        </button>

        <p className="invite-code-modal-title">친구 코드를 입력해주세요</p>

        <input
          type="text"
          className="invite-code-modal-input"
          placeholder="친구 코드 입력"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={isSubmitting}
          autoFocus
        />

        {errorMessage && <p className="invite-code-modal-error">{errorMessage}</p>}

        <button
          type="submit"
          className="invite-code-modal-submit"
          disabled={isSubmitting || !code.trim()}
        >
          {isSubmitting ? '전송 중...' : '확인'}
        </button>
      </form>
    </div>
  )
}
