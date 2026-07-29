import { useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import ProjectIntro from './components/ProjectIntro'
import { supabase } from './lib/supabaseClient'

const STUDY_PLAN_ID_STORAGE_KEY = 'studyPlanId'

function App() {
  const [session, setSession] = useState(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState('')
  const [authSuccessMessage, setAuthSuccessMessage] = useState('')
  const [authMode, setAuthMode] = useState('')
  const [isGuestPlannerOpen, setIsGuestPlannerOpen] = useState(false)
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false)
  const [isNicknameFormOpen, setIsNicknameFormOpen] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameErrorMessage, setNicknameErrorMessage] = useState('')
  const [isNicknameSaving, setIsNicknameSaving] = useState(false)
  const userDisplayName = getUserDisplayName(session?.user)
  const accessToken = session?.access_token || ''

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setAuthErrorMessage(getFriendlyAuthErrorMessage(error.message))
      }

      setSession(data?.session || null)
      setIsSessionLoading(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        setIsGuestPlannerOpen(false)
        setAuthMode('')
      } else {
        resetNicknameForm()
      }
      setIsSessionLoading(false)
    })

    restoreSession()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignIn({ email, password }) {
    const validationMessage = validateAuthInput({ email, password })

    if (validationMessage) {
      setAuthErrorMessage(validationMessage)
      setAuthSuccessMessage('')
      return
    }

    setIsAuthLoading(true)
    setAuthErrorMessage('')
    setAuthSuccessMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (error) {
      setAuthErrorMessage(getFriendlyAuthErrorMessage(error.message))
    }

    setIsAuthLoading(false)
  }

  async function handleSignUp({ email, password, nickname }) {
    const validationMessage = validateAuthInput({ email, password })

    if (validationMessage) {
      setAuthErrorMessage(validationMessage)
      setAuthSuccessMessage('')
      return
    }

    const trimmedNickname = (nickname || '').trim()

    if (!trimmedNickname) {
      setAuthErrorMessage('닉네임을 입력해 주세요.')
      setAuthSuccessMessage('')
      return
    }

    setIsAuthLoading(true)
    setAuthErrorMessage('')
    setAuthSuccessMessage('')

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nickname: trimmedNickname,
        },
      },
    })

    if (error) {
      setAuthErrorMessage(getFriendlyAuthErrorMessage(error.message))
    } else if (data?.session) {
      setSession(data.session)
      setIsGuestPlannerOpen(false)
    } else {
      setAuthSuccessMessage('가입 확인 메일을 보냈습니다. 이메일의 확인 링크를 누른 뒤 로그인해 주세요.')
    }

    setIsAuthLoading(false)
  }

  async function handleSignOut() {
    setIsAuthLoading(true)
    setAuthErrorMessage('')
    resetNicknameForm()

    const { error } = await supabase.auth.signOut()

    if (error) {
      setAuthErrorMessage(getFriendlyAuthErrorMessage(error.message))
    } else {
      localStorage.removeItem(STUDY_PLAN_ID_STORAGE_KEY)
      setSession(null)
      setIsGuestPlannerOpen(true)
    }

    setIsAuthLoading(false)
  }

  function openNicknameForm() {
    setNicknameInput(session?.user?.user_metadata?.nickname || '')
    setNicknameErrorMessage('')
    setIsNicknameFormOpen(true)
  }

  function resetNicknameForm() {
    setIsNicknameFormOpen(false)
    setNicknameInput('')
    setNicknameErrorMessage('')
    setIsNicknameSaving(false)
  }

  async function handleNicknameSave(event) {
    event.preventDefault()
    const trimmedNickname = nicknameInput.trim()

    if (!trimmedNickname) {
      setNicknameErrorMessage('닉네임을 입력해 주세요.')
      return
    }

    setIsNicknameSaving(true)
    setNicknameErrorMessage('')

    const { data, error } = await supabase.auth.updateUser({
      data: {
        nickname: trimmedNickname,
      },
    })

    if (error) {
      setNicknameErrorMessage(error.message || '닉네임 저장 중 문제가 발생했습니다.')
      setIsNicknameSaving(false)
      return
    }

    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession
      }

      return {
        ...currentSession,
        user: data?.user || {
          ...currentSession.user,
          user_metadata: {
            ...currentSession.user?.user_metadata,
            nickname: trimmedNickname,
          },
        },
      }
    })
    resetNicknameForm()
  }

  if (isSessionLoading) {
    return (
      <main className="app">
        <section className="auth-shell">
          <div className="auth-panel">
            <p className="auth-loading">세션을 확인하는 중...</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      {session || isGuestPlannerOpen ? (
        <>
          <header className="auth-status-bar">
            <span>{session ? userDisplayName : '비로그인 체험 중'}</span>
            {session ? (
              <div className="auth-status-actions">
                <button className="secondary-action" type="button" disabled={isAuthLoading} onClick={openNicknameForm}>
                  닉네임 설정
                </button>
                <button className="secondary-action" type="button" disabled={isAuthLoading} onClick={handleSignOut}>
                  {isAuthLoading ? '처리 중...' : '로그아웃'}
                </button>
              </div>
            ) : (
              <div className="auth-status-actions">
                <button className="secondary-action" type="button" onClick={() => setAuthMode('signin')}>
                  로그인
                </button>
                <button className="primary-action" type="button" onClick={() => setAuthMode('signup')}>
                  회원가입
                </button>
              </div>
            )}
          </header>
          {session && isNicknameFormOpen && (
            <form className="nickname-form" noValidate onSubmit={handleNicknameSave}>
              <label className="input-field">
                <span>닉네임</span>
                <input
                  autoComplete="nickname"
                  type="text"
                  value={nicknameInput}
                  onChange={(event) => setNicknameInput(event.target.value)}
                  required
                />
              </label>
              {nicknameErrorMessage && <p className="form-message form-message-error">{nicknameErrorMessage}</p>}
              <div className="form-actions">
                <button className="primary-action" type="submit" disabled={isNicknameSaving}>
                  {isNicknameSaving ? '저장 중...' : '저장'}
                </button>
                <button className="secondary-action" type="button" disabled={isNicknameSaving} onClick={resetNicknameForm}>
                  취소
                </button>
              </div>
            </form>
          )}
          {authErrorMessage && <p className="form-message form-message-error">{authErrorMessage}</p>}
          {!session && authMode ? (
            <AuthScreen
              errorMessage={authErrorMessage}
              isLoading={isAuthLoading}
              mode={authMode}
              successMessage={authSuccessMessage}
              onBack={() => {
                setAuthMode('')
                setAuthErrorMessage('')
                setAuthSuccessMessage('')
              }}
              onSelectMode={(nextMode) => {
                setAuthMode(nextMode)
                setAuthErrorMessage('')
                setAuthSuccessMessage('')
              }}
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              onStartGuest={() => setIsGuestPlannerOpen(true)}
            />
          ) : (
            <ProjectIntro
              key={session?.user?.id || 'guest'}
              accessToken={accessToken}
              isAuthenticated={Boolean(session)}
              onAuthRequired={() => setIsAuthPromptOpen(true)}
            />
          )}
          {isAuthPromptOpen && (
            <div className="auth-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-required-title">
              <div className="auth-modal">
                <h2 id="auth-required-title">로그인이 필요합니다</h2>
                <p>학습 기록을 저장하고 다음 계획에 반영하려면 로그인해 주세요.</p>
                <div className="form-actions auth-actions">
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => {
                      setAuthMode('signin')
                      setIsAuthPromptOpen(false)
                    }}
                  >
                    로그인
                  </button>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => {
                      setAuthMode('signup')
                      setIsAuthPromptOpen(false)
                    }}
                  >
                    회원가입
                  </button>
                  <button className="secondary-action" type="button" onClick={() => setIsAuthPromptOpen(false)}>
                    나중에
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <AuthScreen
          errorMessage={authErrorMessage}
          isLoading={isAuthLoading}
          mode={authMode}
          successMessage={authSuccessMessage}
          onBack={() => {
            setAuthMode('')
            setAuthErrorMessage('')
            setAuthSuccessMessage('')
          }}
          onSelectMode={(nextMode) => {
            setAuthMode(nextMode)
            setAuthErrorMessage('')
            setAuthSuccessMessage('')
          }}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onStartGuest={() => setIsGuestPlannerOpen(true)}
        />
      )}
    </main>
  )
}

function validateAuthInput({ email, password }) {
  if (!email.trim()) {
    return '이메일을 입력해 주세요.'
  }

  if (!password) {
    return '비밀번호를 입력해 주세요.'
  }

  return ''
}

function getUserDisplayName(user) {
  const nickname = user?.user_metadata?.nickname?.trim()

  if (nickname) {
    return `${nickname}님`
  }

  const emailPrefix = user?.email?.split('@')[0]?.trim()

  if (emailPrefix) {
    return `${emailPrefix}님`
  }

  return '사용자님'
}

function getFriendlyAuthErrorMessage(message = '') {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  if (normalizedMessage.includes('for security purposes') || normalizedMessage.includes('request this after')) {
    return '회원가입 요청이 너무 빠르게 반복되었습니다. 잠시 후 다시 시도해 주세요.'
  }

  if (normalizedMessage.includes('anonymous')) {
    return '이메일과 비밀번호를 입력해 회원가입해 주세요.'
  }

  if (
    normalizedMessage.includes('already registered')
    || normalizedMessage.includes('already exists')
    || normalizedMessage.includes('user already')
    || normalizedMessage.includes('email address is already')
  ) {
    return '이미 가입된 이메일입니다. 로그인해 주세요.'
  }

  if (normalizedMessage.includes('password')) {
    return '비밀번호를 확인해 주세요. 6자 이상 입력해야 합니다.'
  }

  if (normalizedMessage.includes('email')) {
    return '이메일 주소를 확인해 주세요.'
  }

  return message || '인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}

export default App
