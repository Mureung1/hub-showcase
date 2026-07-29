import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { toKoAuthError } from '../lib/authErrors.js'
import './AuthPage.css'

// mode: 'login' | 'signup' — 라우트(/login, /signup)에 따라 App.jsx가 넘긴다.
function AuthPage({ mode = 'login' }) {
  const isSignup = mode === 'signup'
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  // 가입 성공 후 "게임 기획이 처음이신가요?" 단계로 전환.
  const [askBeginner, setAskBeginner] = useState(false)

  if (!auth.isAuthEnabled) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">로그인 준비 중</h1>
          <p className="rs-auth-sub">
            Supabase Auth 설정(<code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>
            )이 아직 없어 로그인 기능이 비활성화되어 있어요. 회원가입 없이도 문서 작성·열람은
            가능합니다.
          </p>
          <Link to="/write" className="rs-btn rs-btn-primary">
            비회원으로 작성해보기
          </Link>
        </section>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (isSignup) {
        const { data, error } = await auth.signUpWithEmail(email, password)
        if (error) throw error
        if (data.session) {
          // 이메일 확인이 꺼져 있어 바로 로그인된 경우 → 초심자 질문으로.
          setAskBeginner(true)
        } else {
          // 이메일 확인이 켜진 경우 → 안내만.
          setNotice('확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료한 뒤 로그인해 주세요.')
        }
      } else {
        const { error } = await auth.signInWithEmail(email, password)
        if (error) throw error
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(toKoAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleProvider(provider) {
    setError(null)
    try {
      const { error } = await auth.signInWithProvider(provider)
      if (error) throw error
      // OAuth는 리다이렉트로 진행되므로 이후 처리는 돌아온 뒤 세션 구독이 담당.
    } catch (err) {
      setError(toKoAuthError(err, '소셜 로그인에 실패했어요.'))
    }
  }

  async function chooseBeginner(isBeginner) {
    try {
      await auth.updateProfile({ isBeginner })
    } catch {
      // 프로필 저장 실패해도 흐름은 계속(치명적이지 않음).
    }
    navigate(isBeginner ? '/tutorial' : '/', { replace: true })
  }

  if (askBeginner) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">가입 완료! 🎉</h1>
          <p className="rs-auth-sub">마지막으로 하나만 여쭤볼게요.</p>
          <p className="rs-auth-question">게임 기획이 처음이신가요?</p>
          <div className="rs-auth-choices">
            <button className="rs-btn rs-btn-primary" onClick={() => chooseBeginner(true)}>
              네, 처음이에요 — 튜토리얼 볼래요
            </button>
            <button className="rs-btn" onClick={() => chooseBeginner(false)}>
              아니요, 바로 시작할게요
            </button>
          </div>
          <p className="rs-auth-hint">튜토리얼은 나중에 상단 메뉴에서 언제든 다시 볼 수 있어요.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="rs-auth">
      <section className="rs-panel rs-auth-panel">
        <h1 className="rs-auth-title">{isSignup ? '회원가입' : '로그인'}</h1>
        <p className="rs-auth-sub">
          {isSignup
            ? '계정을 만들면 내 기획서를 계정에 모으고, 제출 즉시 AI 피드백을 받을 수 있어요.'
            : '다시 오셨네요. 내 기획서를 이어서 작성해보세요.'}
        </p>

        <div className="rs-auth-providers">
          <button className="rs-btn" onClick={() => handleProvider('google')} type="button">
            Google로 계속하기
          </button>
          <button className="rs-btn" onClick={() => handleProvider('github')} type="button">
            Github로 계속하기
          </button>
        </div>

        <div className="rs-auth-divider">
          <span>또는 이메일로</span>
        </div>

        <form className="rs-auth-form" onSubmit={handleSubmit}>
          <label className="rs-auth-field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label className="rs-auth-field">
            <span>비밀번호</span>
            <div className="rs-auth-pw">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="6자 이상"
              />
              <button
                type="button"
                className="rs-auth-pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPw ? '숨기기' : '표시'}
              </button>
            </div>
          </label>

          {!isSignup && (
            <p className="rs-auth-forgot">
              <Link to="/reset-password">비밀번호를 잊으셨나요?</Link>
            </p>
          )}

          {error && <p className="rs-auth-error">{error}</p>}
          {notice && <p className="rs-auth-notice">{notice}</p>}

          <button className="rs-btn rs-btn-primary rs-auth-submit" type="submit" disabled={busy}>
            {busy ? '처리 중…' : isSignup ? '가입하기' : '로그인'}
          </button>
        </form>

        <p className="rs-auth-switch">
          {isSignup ? (
            <>
              이미 계정이 있으신가요? <Link to="/login">로그인</Link>
            </>
          ) : (
            <>
              처음이신가요? <Link to="/signup">회원가입</Link>
            </>
          )}
        </p>
      </section>
    </div>
  )
}

export default AuthPage
