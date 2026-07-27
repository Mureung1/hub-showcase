import { useState } from 'react'
import hero from '../assets/hero.png'

function EntryScreen({
  onStartGuest,
  onAuthenticated,
  supabaseClient,
  isSupabaseConfigured,
}) {
  const [view, setView] = useState('choice')
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAuth(event) {
    event.preventDefault()
    setLoginNotice('')
    setLoginError('')

    if (!isSupabaseConfigured || !supabaseClient) {
      setLoginError('Supabase 공개 키 설정이 필요합니다. client/.env를 확인해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = authMode === 'signup'
        ? await supabaseClient.auth.signUp({ email, password })
        : await supabaseClient.auth.signInWithPassword({ email, password })

      if (result.error) {
        throw result.error
      }

      if (result.data.session) {
        onAuthenticated(result.data.session)
        return
      }

      setLoginNotice('가입 확인 메일을 보냈어요. 이메일 인증 후 로그인해 주세요.')
      setAuthMode('login')
    } catch (error) {
      setLoginError(error.message || '로그인을 처리하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeAuthMode(nextMode) {
    setAuthMode(nextMode)
    setLoginNotice('')
    setLoginError('')
  }

  return (
    <main className="entry-shell">
      <section className="entry-card">
        <img className="entry-hero" src={hero} alt="" />
        <span className="badge">나를 위한 하루 정리</span>
        <h1>하루 체크아웃</h1>
        <p className="entry-lead">
          정리되지 않은 하루를 감정, 원인, 내일의 작은 행동으로 나눠보세요.
        </p>

        {view === 'choice' ? (
          <div className="entry-options">
            <button className="entry-option entry-option-primary" type="button" onClick={onStartGuest}>
              <span className="entry-option-title">게스트로 시작</span>
              <span>가입 없이 바로 사용하고 이 기기에만 기록해요.</span>
              <strong>바로 시작하기 →</strong>
            </button>

            <button className="entry-option" type="button" onClick={() => setView('login')}>
              <span className="entry-option-row">
                <span className="entry-option-title">로그인해서 동기화</span>
                <span className="coming-badge">선택 기능</span>
              </span>
              <span>선택한 기기 기록을 Supabase에 복사하고 여러 기기에서 확인해요.</span>
              <strong>로그인·회원가입 →</strong>
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleAuth}>
            <div className="login-heading">
              <button className="back-link" type="button" onClick={() => {
                setView('choice')
                setLoginNotice('')
                setLoginError('')
              }}>← 돌아가기</button>
              <h2>{authMode === 'signup' ? '계정 만들기' : '다시 만나서 반가워요'}</h2>
              <p>로그인한 기록만 Supabase에 저장되고 여러 기기에서 동기화돼요.</p>
            </div>

            <div className="auth-mode-switch" aria-label="로그인 방식">
              <button
                className={authMode === 'login' ? 'active' : ''}
                type="button"
                onClick={() => changeAuthMode('login')}
              >로그인</button>
              <button
                className={authMode === 'signup' ? 'active' : ''}
                type="button"
                onClick={() => changeAuthMode('signup')}
              >회원가입</button>
            </div>

            <label>
              이메일
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6자 이상 입력해 주세요"
                autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </label>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? '처리하는 중…' : authMode === 'signup' ? '회원가입' : '로그인'}
            </button>
            {loginNotice && <p className="login-notice" role="status">{loginNotice}</p>}
            {loginError && <p className="feedback feedback-error" role="alert">{loginError}</p>}
            <button className="guest-link" type="button" onClick={onStartGuest}>
              계정 없이 게스트로 계속하기
            </button>
          </form>
        )}

        <p className="privacy-note">
          게스트 기록은 자동으로 업로드되지 않아요. 로그인 후 직접 복사를 선택할 수 있어요.
        </p>
      </section>
    </main>
  )
}

export default EntryScreen
