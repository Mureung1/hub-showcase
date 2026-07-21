import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import logo from '../assets/logo.png'
import { api, apiPost } from '../api/client'
import './Auth.css'

const USERNAME_RE = /^[a-zA-Z0-9_]{4,20}$/ // 4~20자 영문/숫자/밑줄
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/ // 8자 이상, 영문+숫자

export default function Signup() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', passwordConfirm: '' })
  const [check, setCheck] = useState({ status: 'idle', message: '' }) // idle|checking|available|taken|invalid
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function patch(partial) {
    setError('')
    // 아이디를 바꾸면 이전 중복확인 결과는 무효
    if ('username' in partial) setCheck({ status: 'idle', message: '' })
    setForm((f) => ({ ...f, ...partial }))
  }

  async function handleCheck() {
    const username = form.username.trim()
    if (!USERNAME_RE.test(username)) {
      setCheck({ status: 'invalid', message: '아이디는 4~20자의 영문·숫자·밑줄만 사용할 수 있습니다.' })
      return
    }
    setCheck({ status: 'checking', message: '확인 중…' })
    try {
      const { available, reason } = await api(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
      setCheck(
        available
          ? { status: 'available', message: '사용할 수 있는 아이디입니다.' }
          : { status: 'taken', message: reason ?? '사용중인 아이디입니다.' },
      )
    } catch (err) {
      setCheck({ status: 'invalid', message: err.message })
    }
  }

  const passwordMismatch = form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm
  const canSubmit =
    form.name.trim() &&
    USERNAME_RE.test(form.username.trim()) &&
    PASSWORD_RE.test(form.password) &&
    form.password === form.passwordConfirm &&
    check.status !== 'taken' &&
    !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('이름을 입력해 주세요.')
    if (!USERNAME_RE.test(form.username.trim())) return setError('아이디는 4~20자의 영문·숫자·밑줄만 사용할 수 있습니다.')
    if (!PASSWORD_RE.test(form.password)) return setError('비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.')
    if (form.password !== form.passwordConfirm) return setError('비밀번호가 일치하지 않습니다.')

    setSubmitting(true)
    try {
      // 성공 시 서버가 세션 쿠키를 심어 자동 로그인 상태가 된다 → 대시보드로 이동
      await apiPost('/api/auth/signup', {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/app/dashboard')
    } catch (err) {
      if (err.status === 409) setCheck({ status: 'taken', message: '사용중인 아이디입니다.' })
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <span className="auth-logo">
            <img src={logo} alt="" />
          </span>
          <h1>팀플, 이지!</h1>
          <p>새로운 협업의 시작, 팀플 이지에 오신 것을 환영합니다.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="su-name">이름</label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">👤</span>
              <input
                id="su-name"
                name="name"
                placeholder="성함을 입력하세요"
                autoComplete="name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-id">아이디</label>
            <div className="auth-field-row">
              <div className="auth-input">
                <span className="field-icon" aria-hidden="true">🪪</span>
                <input
                  id="su-id"
                  name="username"
                  placeholder="사용할 아이디 (영문·숫자 4~20자)"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => patch({ username: e.target.value })}
                />
              </div>
              <button
                type="button"
                className="check-btn"
                onClick={handleCheck}
                disabled={!form.username.trim() || check.status === 'checking'}
              >
                중복확인
              </button>
            </div>
            {check.status !== 'idle' && (
              <p className={`auth-field-msg${check.status === 'available' ? ' ok' : check.status === 'checking' ? '' : ' error'}`}>
                {check.message}
              </p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="su-email">
              이메일
              <span className="optional">(선택)</span>
            </label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">✉️</span>
              <input
                id="su-email"
                name="email"
                type="email"
                placeholder="example@email.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pw">비밀번호</label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">🔒</span>
              <input
                id="su-pw"
                name="password"
                type={showPw ? 'text' : 'password'}
                placeholder="8자 이상, 영문/숫자 조합"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => patch({ password: e.target.value })}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pw2">비밀번호 확인</label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">🛡️</span>
              <input
                id="su-pw2"
                name="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
                value={form.passwordConfirm}
                onChange={(e) => patch({ passwordConfirm: e.target.value })}
              />
            </div>
            {passwordMismatch && <p className="auth-field-msg error">비밀번호가 일치하지 않습니다.</p>}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-dark auth-submit" disabled={!canSubmit}>
            {submitting ? '가입 중…' : '회원가입'}
          </button>
        </form>

        <p className="auth-switch">
          이미 계정이 있으신가요?
          <Link to="/login">로그인</Link>
        </p>
      </div>

      <p className="auth-terms">
        가입 시 팀플, 이지!의 <u>이용약관</u> 및 <u>개인정보처리방침</u>에 동의하게 됩니다.
      </p>
    </div>
  )
}
