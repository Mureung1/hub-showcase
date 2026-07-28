import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isValidEmail } from '../lib/validateEmail'

function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValidEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }
    setSubmitting(true)
    setError(null)
    await resetPasswordForEmail({ email })
    setSubmitting(false)
    // 가입 여부가 외부에 노출되지 않도록 성공/실패와 무관하게 항상 같은 안내를 보여준다.
    setSent(true)
  }

  return (
    <div className="screen">
      <h1>비밀번호 찾기</h1>
      <p className="sub">가입한 이메일로 재설정 링크를 보내드려요.</p>

      {sent ? (
        <p className="sub">입력하신 이메일로 재설정 링크를 보냈어요. 받은편지함(스팸함 포함)을 확인해주세요.</p>
      ) : (
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field field-full">
              <span className="field-label">이메일</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>

          {error && <p className="checklist-detail-fail">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '전송 중…' : '재설정 링크 받기'}
          </button>
          <p className="sub" style={{ margin: '14px 0 0' }}>
            <Link to="/login">로그인으로 돌아가기</Link>
          </p>
        </form>
      )}
    </div>
  )
}

export default ForgotPasswordPage
