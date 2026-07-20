import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router'
import logo from '../../assets/logo.png'
import { DEMO_PROJECT_ID, fallbackProject, makeMembers, typeLabelOf } from './flowMock'
import '../Auth.css'
import './flow.css'

/* 초대 링크 착지 화면 — 팀원이 프로젝트를 확인하고 그 자리에서 가입 + 닉네임을 정한다.
   4단계에서 토큰으로 프로젝트를 조회하고 실제 가입 API를 호출하도록 교체된다. */
export default function Join() {
  const { token } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const project = useMemo(() => ({ ...fallbackProject(), ...(state ?? {}) }), [state])

  // 생성자 + 먼저 합류한 팀원들. 마지막 한 자리가 지금 들어온 사람 몫이다
  const members = useMemo(() => makeMembers(project.headcount), [project.headcount])
  const joined = Math.max(project.headcount - 1, 1)
  const isFull = joined >= project.headcount

  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '', nickname: '' })
  const [error, setError] = useState('')

  const takenNicknames = members.slice(0, joined).map((m) => m.name)

  function patch(partial) {
    setError('')
    setForm((f) => ({ ...f, ...partial }))
  }

  const canSubmit =
    form.name.trim() && form.username.trim() && form.password.length >= 8 && form.nickname.trim()

  function handleSubmit(e) {
    e.preventDefault()
    // 4단계: 서버가 정원·닉네임 중복을 검사한다 (여기서는 같은 규칙을 화면에서 확인)
    if (takenNicknames.includes(form.nickname.trim())) {
      setError('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.')
      return
    }
    navigate(`/projects/${DEMO_PROJECT_ID}/survey`, {
      state: { ...project, myNickname: form.nickname.trim() },
    })
  }

  if (isFull) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-head">
          <span className="auth-logo"><img src={logo} alt="" /></span>
          <h1>정원이 가득 찼습니다</h1>
          <p>
            이 프로젝트는 이미 {project.headcount}명이 모두 합류했습니다.
            팀 생성자에게 문의해 주세요.
          </p>
          <div className="auth-divider" />
          <p className="auth-switch"><Link to="/">홈으로 돌아가기</Link></p>
        </div>
      </div>
    )
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
          <strong>{project.title}</strong>
          <p>{project.topic}</p>
          <div className="flow-meta">
            <span className="flow-chip">{typeLabelOf(project.typeHint)}</span>
            <span className="flow-chip">{joined} / {project.headcount}명 합류</span>
          </div>
          <div className="slot-list">
            {members.map((m, i) => (
              <span key={m.id} className={`slot${i < joined ? ' filled' : ''}`}>
                {i < joined ? `${m.name}${m.isCreator ? ' (생성자)' : ''}` : '내 자리'}
              </span>
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
                  placeholder="사용할 아이디"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => patch({ username: e.target.value })}
                />
              </div>
              {/* 4단계에서 중복확인 API 연결 */}
              <button type="button" className="check-btn">중복확인</button>
            </div>
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
            {error && <p className="join-error">{error}</p>}
          </div>

          <button type="submit" className="btn btn-dark auth-submit" disabled={!canSubmit}>
            가입하고 설문 시작하기
          </button>
        </form>

        <p className="auth-terms">초대 코드: {token}</p>
      </div>
    </div>
  )
}
