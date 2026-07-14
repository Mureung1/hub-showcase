import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import logo from '../assets/logo.png'
import './Auth.css'

export default function Signup() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)

  // 4단계에서 실제 가입 API로 교체 — 지금은 화면 이동만
  function handleSubmit(e) {
    e.preventDefault()
    navigate('/login')
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
              <input id="su-name" name="name" placeholder="성함을 입력하세요" autoComplete="name" />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-id">아이디</label>
            <div className="auth-field-row">
              <div className="auth-input">
                <span className="field-icon" aria-hidden="true">🪪</span>
                <input id="su-id" name="username" placeholder="사용할 아이디" autoComplete="username" />
              </div>
              {/* 4단계에서 중복확인 API 연결 */}
              <button type="button" className="check-btn">중복확인</button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-email">
              이메일
              <span className="optional">(선택)</span>
            </label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">✉️</span>
              <input id="su-email" name="email" type="email" placeholder="example@email.com" autoComplete="email" />
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
              />
            </div>
          </div>

          <button type="submit" className="btn btn-dark auth-submit">회원가입</button>
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
