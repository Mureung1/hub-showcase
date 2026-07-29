import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { toKoAuthError } from '../lib/authErrors.js'

// 마이페이지의 "계정 설정" — 프로필(닉네임·한 줄 소개) / 이메일 변경 / 비밀번호 변경.
// 인증(이메일·비번 변경)은 Supabase 직접 호출, 프로필은 backend 경유(useAuth 헬퍼).
function AccountSettings() {
  const auth = useAuth()
  const email = auth.user?.email ?? ''
  // 이메일 로그인 수단이 있는 계정만 비밀번호 변경 가능(소셜 전용 계정은 비번이 없다).
  const providers = auth.user?.app_metadata?.providers ?? [auth.user?.app_metadata?.provider]
  const hasPassword = providers.includes('email')

  // ── 프로필 ──
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [profileMsg, setProfileMsg] = useState(null)
  const [profileErr, setProfileErr] = useState(null)
  const [profileBusy, setProfileBusy] = useState(false)

  // ── 이메일 변경 ──
  const [newEmail, setNewEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailErr, setEmailErr] = useState(null)
  const [emailBusy, setEmailBusy] = useState(false)

  // ── 비밀번호 변경 ──
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [pwErr, setPwErr] = useState(null)
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    let alive = true
    auth
      .getProfile()
      .then((p) => {
        if (!alive) return
        setNickname(p.nickname ?? '')
        setBio(p.bio ?? '')
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveProfile(e) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileErr(null)
    setProfileBusy(true)
    try {
      await auth.updateProfile({ nickname: nickname.trim(), bio: bio.trim() })
      setProfileMsg('저장했어요.')
    } catch (err) {
      setProfileErr(err.message ?? '프로필을 저장하지 못했어요.')
    } finally {
      setProfileBusy(false)
    }
  }

  async function changeEmail(e) {
    e.preventDefault()
    setEmailMsg(null)
    setEmailErr(null)
    if (!newEmail.trim() || newEmail.trim() === email) {
      return setEmailErr('현재와 다른 새 이메일을 입력해 주세요.')
    }
    setEmailBusy(true)
    try {
      const { error } = await auth.updateEmail(newEmail.trim())
      if (error) throw error
      setEmailMsg('확인 메일을 보냈어요. 새 이메일의 링크를 눌러야 변경이 완료돼요.')
      setNewEmail('')
    } catch (err) {
      setEmailErr(toKoAuthError(err))
    } finally {
      setEmailBusy(false)
    }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwMsg(null)
    setPwErr(null)
    if (newPw.length < 6) return setPwErr('새 비밀번호는 6자 이상이어야 해요.')
    if (newPw !== newPw2) return setPwErr('새 비밀번호가 서로 달라요.')
    setPwBusy(true)
    try {
      // 본인 확인: 현재 비밀번호로 재로그인 시도.
      const { error: reErr } = await auth.reauthenticate(email, curPw)
      if (reErr) throw new Error('현재 비밀번호가 올바르지 않아요.')
      const { error } = await auth.updatePassword(newPw)
      if (error) throw error
      setPwMsg('비밀번호를 변경했어요.')
      setCurPw('')
      setNewPw('')
      setNewPw2('')
    } catch (err) {
      setPwErr(toKoAuthError(err, err.message))
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="rs-panel rs-home-section rs-account">
      <h2>계정 설정</h2>

      {/* 프로필 */}
      <form className="rs-account-block" onSubmit={saveProfile}>
        <h3 className="rs-account-h3">프로필</h3>
        <p className="rs-empty">문서·코멘트에 표시되는 정보예요.</p>
        <label className="rs-account-field">
          <span>닉네임</span>
          <input
            className="rs-pw-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 기획하는 곰"
          />
        </label>
        <label className="rs-account-field">
          <span>한 줄 소개</span>
          <input
            className="rs-pw-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="예: 로그라이크와 경제 시스템을 좋아합니다"
            maxLength={80}
          />
        </label>
        <div className="rs-account-actions">
          <button type="submit" className="rs-btn rs-btn-primary" disabled={profileBusy}>
            {profileBusy ? '저장 중…' : '프로필 저장'}
          </button>
          {profileMsg && <span className="rs-editor-saved">{profileMsg}</span>}
          {profileErr && <span className="rs-pw-error">{profileErr}</span>}
        </div>
      </form>

      {/* 이메일 변경 */}
      <form className="rs-account-block" onSubmit={changeEmail}>
        <h3 className="rs-account-h3">이메일 변경</h3>
        <p className="rs-empty">
          현재: <strong>{email}</strong>
        </p>
        <label className="rs-account-field">
          <span>새 이메일</span>
          <input
            className="rs-pw-input"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            autoComplete="email"
          />
        </label>
        <div className="rs-account-actions">
          <button type="submit" className="rs-btn rs-btn-primary" disabled={emailBusy}>
            {emailBusy ? '처리 중…' : '이메일 변경'}
          </button>
          {emailMsg && <span className="rs-editor-saved">{emailMsg}</span>}
          {emailErr && <span className="rs-pw-error">{emailErr}</span>}
        </div>
      </form>

      {/* 비밀번호 변경 */}
      <div className="rs-account-block">
        <h3 className="rs-account-h3">비밀번호 변경</h3>
        {hasPassword ? (
          <form onSubmit={changePassword}>
            <label className="rs-account-field">
              <span>현재 비밀번호</span>
              <input
                className="rs-pw-input"
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="rs-account-field">
              <span>새 비밀번호</span>
              <input
                className="rs-pw-input"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                minLength={6}
                autoComplete="new-password"
                placeholder="6자 이상"
              />
            </label>
            <label className="rs-account-field">
              <span>새 비밀번호 확인</span>
              <input
                className="rs-pw-input"
                type="password"
                value={newPw2}
                onChange={(e) => setNewPw2(e.target.value)}
                minLength={6}
                autoComplete="new-password"
              />
            </label>
            <div className="rs-account-actions">
              <button type="submit" className="rs-btn rs-btn-primary" disabled={pwBusy}>
                {pwBusy ? '변경 중…' : '비밀번호 변경'}
              </button>
              {pwMsg && <span className="rs-editor-saved">{pwMsg}</span>}
              {pwErr && <span className="rs-pw-error">{pwErr}</span>}
            </div>
          </form>
        ) : (
          <p className="rs-empty">
            소셜 로그인(Google·Github) 계정이라 비밀번호가 없어요. 로그인은 소셜 제공자에서
            관리됩니다.
          </p>
        )}
      </div>
    </div>
  )
}

export default AccountSettings
