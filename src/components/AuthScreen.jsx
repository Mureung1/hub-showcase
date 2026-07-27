import { useEffect, useState } from 'react'

function AuthScreen({ errorMessage, isLoading, mode, successMessage, onBack, onSelectMode, onSignIn, onSignUp, onStartGuest }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isSignUp = mode === 'signup'

  useEffect(() => {
    setIsPasswordVisible(false)
  }, [mode])

  async function handleSubmit(event) {
    event.preventDefault()
    const authPayload = { email, password }

    if (isSignUp) {
      await onSignUp(authPayload)
      return
    }

    await onSignIn(authPayload)
  }

  if (!mode) {
    return (
      <section className="landing-page" aria-labelledby="landing-title">
        <header className="landing-header">
          <strong>Study Plan</strong>
          <nav className="landing-nav" aria-label="인증 메뉴">
            <button className="secondary-action" type="button" onClick={() => onSelectMode('signin')}>
              로그인
            </button>
            <button className="primary-action" type="button" onClick={() => onSelectMode('signup')}>
              회원가입
            </button>
          </nav>
        </header>

        <div className="landing-main">
          <div className="landing-copy">
            <span className="intro-label">Study Plan</span>
            <h1 id="landing-title">나에게 맞는 오늘의 학습 계획</h1>
            <p>시험과 목표, 취약 영역을 바탕으로 매일 달라지는 학습 계획을 만들어 주는 서비스</p>
            <button className="primary-action landing-start" type="button" onClick={onStartGuest}>
              학습 계획 시작하기
            </button>
          </div>

          <div className="flow-list" aria-label="주요 흐름">
            <span>시험 선택</span>
            <span>목표 입력</span>
            <span>취약 영역 진단</span>
            <span>오늘의 학습</span>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-shell" aria-labelledby="auth-title">
      <div className="auth-panel">
        <div className="section-head auth-head">
          <span className="intro-label">Study Plan</span>
          <h1 id="auth-title">{isSignUp ? '회원가입' : '로그인'}</h1>
          <p>{isSignUp ? '이메일과 비밀번호로 학습 플래너 계정을 만듭니다.' : '이메일로 로그인하면 학습 플래너를 이어서 사용할 수 있습니다.'}</p>
        </div>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <label className="input-field">
            <span>이메일</span>
            <input
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="input-field">
            <span>비밀번호</span>
            <span className="password-input-wrap">
              <input
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
              >
                {isPasswordVisible ? '숨기기' : '보기'}
              </button>
            </span>
          </label>

          {errorMessage && <p className="form-message form-message-error">{errorMessage}</p>}
          {successMessage && <p className="form-message form-message-success">{successMessage}</p>}

          <div className="form-actions auth-actions">
            <button className="primary-action" type="submit" disabled={isLoading || Boolean(successMessage)}>
              {isLoading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
            </button>
            {successMessage && (
              <button className="secondary-action" type="button" onClick={() => onSelectMode('signin')}>
                로그인으로 이동
              </button>
            )}
            <button className="secondary-action" type="button" disabled={isLoading} onClick={onBack}>
              돌아가기
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default AuthScreen
