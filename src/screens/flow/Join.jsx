import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import logo from '../../assets/logo.png'
import { api, apiPost, useApi } from '../../api/client'
import { getTypeById } from '../../data/templates'
import '../Auth.css'
import './flow.css'

const USERNAME_RE = /^[a-zA-Z0-9_]{4,20}$/ // 4~20자 영문/숫자/밑줄
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/ // 8자 이상, 영문+숫자

/* 초대 링크 착지 화면 — 팀원이 프로젝트를 확인하고 그 자리에서 가입 + 닉네임을 정한다.
   서버(GET /api/join/:token)로 미리보기를 조회하고, POST로 가입+합류(자동 로그인)한다. */
export default function Join() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { loading, error, data } = useApi(`/api/join/${token}`)

  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '', nickname: '' })
  const [check, setCheck] = useState({ status: 'idle', message: '' }) // idle|checking|available|taken|invalid
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function patch(partial) {
    setSubmitError('')
    if ('username' in partial) setCheck({ status: 'idle', message: '' }) // 아이디 바꾸면 이전 확인 무효
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

  /* ---------- 조회 상태 분기 ---------- */

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-head">
          <span className="auth-logo"><img src={logo} alt="" /></span>
          <h1>불러오는 중…</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-head">
          <span className="auth-logo"><img src={logo} alt="" /></span>
          <h1>초대 링크를 확인해 주세요</h1>
          <p>{error}</p>
          <div className="auth-divider" />
          <p className="auth-switch"><Link to="/">홈으로 돌아가기</Link></p>
        </div>
      </div>
    )
  }

  if (data.isFull) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-head">
          <span className="auth-logo"><img src={logo} alt="" /></span>
          <h1>정원이 가득 찼습니다</h1>
          <p>
            이 프로젝트는 이미 {data.headcount}명이 모두 합류했습니다.
            팀 생성자에게 문의해 주세요.
          </p>
          <div className="auth-divider" />
          <p className="auth-switch"><Link to="/">홈으로 돌아가기</Link></p>
        </div>
      </div>
    )
  }

  /* ---------- 가입 폼 ---------- */

  const typeLabel = getTypeById(data.typeHint)?.label ?? '선택 안 함'
  const takenNicknames = data.members.map((m) => m.nickname)
  const canSubmit =
    form.name.trim() &&
    USERNAME_RE.test(form.username.trim()) &&
    PASSWORD_RE.test(form.password) &&
    form.nickname.trim() &&
    check.status !== 'taken' &&
    !submitting

  // 참여 슬롯: 이미 합류한 팀원 → 내 자리 → 남은 대기 자리
  const slots = Array.from({ length: data.headcount }, (_, i) => {
    if (i < data.members.length) {
      const m = data.members[i]
      return { key: i, label: `${m.nickname}${m.isCreator ? ' (생성자)' : ''}`, filled: true }
    }
    if (i === data.members.length) return { key: i, label: '내 자리', filled: false }
    return { key: i, label: '대기 중', filled: false }
  })

  async function handleSubmit(e) {
    e.preventDefault()
    const nickname = form.nickname.trim()
    if (takenNicknames.includes(nickname)) {
      setSubmitError('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      // 성공 시 서버가 계정을 만들고 세션 쿠키를 심어 자동 로그인 → 설문으로 이동
      const res = await apiPost(`/api/join/${token}`, {
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        nickname,
      })
      navigate(`/projects/${res.projectId}/survey`)
    } catch (err) {
      if (err.status === 409 && err.message.includes('아이디')) {
        setCheck({ status: 'taken', message: '사용중인 아이디입니다.' })
      }
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <span className="auth-logo"><img src={logo} alt="" /></span>
          <h1>팀에 초대되었습니다</h1>
          <p>가입하고 닉네임을 정하면 바로 팀에 합류합니다.</p>
        </div>

        <div className="join-preview">
          <strong>{data.title}</strong>
          <p>{data.topic}</p>
          <div className="flow-meta">
            <span className="flow-chip">{typeLabel}</span>
            <span className="flow-chip">{data.joinedCount} / {data.headcount}명 합류</span>
          </div>
          <div className="slot-list">
            {slots.map((s) => (
              <span key={s.key} className={`slot${s.filled ? ' filled' : ''}`}>{s.label}</span>
            ))}
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="jn-name">이름</label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">👤</span>
              <input
                id="jn-name"
                placeholder="성함을 입력하세요"
                autoComplete="name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="jn-id">아이디</label>
            <div className="auth-field-row">
              <div className="auth-input">
                <span className="field-icon" aria-hidden="true">🪪</span>
                <input
                  id="jn-id"
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
            <label htmlFor="jn-pw">비밀번호</label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">🔒</span>
              <input
                id="jn-pw"
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
            <label htmlFor="jn-nick">
              팀에서 쓸 닉네임
              <span className="optional">팀원에게 보이는 이름</span>
            </label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">🏷️</span>
              <input
                id="jn-nick"
                placeholder="예: 지훈"
                value={form.nickname}
                onChange={(e) => patch({ nickname: e.target.value })}
              />
            </div>
            {submitError && <p className="join-error">{submitError}</p>}
          </div>

          <button type="submit" className="btn btn-dark auth-submit" disabled={!canSubmit}>
            {submitting ? '합류 중…' : '가입하고 설문 시작하기'}
          </button>
        </form>

        <p className="auth-terms">초대 코드: {token}</p>
      </div>
    </div>
  )
}
