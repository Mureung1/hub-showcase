import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: updateError } = await updatePassword({ password })
    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    // 재설정 링크를 클릭한 시점에 Supabase가 이미 세션을 심어뒀으므로, 비밀번호 변경 후
    // 별도 로그인 없이 그대로 로그인 상태로 홈으로 이동한다("자동 로그인 전환").
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="screen">
        <h1>새 비밀번호 설정</h1>
        <p className="sub">확인하는 중…</p>
      </div>
    )
  }

  // 재설정 링크가 아니라 주소를 직접 입력했거나 링크가 만료된 경우 Supabase가 세션을 심어주지 않는다.
  if (!user) {
    return (
      <div className="screen">
        <h1>새 비밀번호 설정</h1>
        <p className="sub">유효하지 않거나 만료된 링크예요. 비밀번호 찾기를 다시 요청해주세요.</p>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>새 비밀번호 설정</h1>
      <p className="sub">새로 사용할 비밀번호를 입력해주세요.</p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field field-full">
            <span className="field-label">새 비밀번호</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="checklist-detail-fail">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}

export default ResetPasswordPage
