import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import logo from '../../assets/logo.png'
import { fallbackProject, makeInviteToken } from './flowMock'
import './flow.css'

/* 초대 링크 발급 — 계획 확정 직후 생성자가 보는 화면.
   4단계에서 토큰은 서버가 발급하고, 참여 현황은 폴링으로 갱신된다. */
export default function InviteLink() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const project = useMemo(() => ({ ...fallbackProject(), ...(state ?? {}) }), [state])
  const token = useMemo(() => makeInviteToken(), [])
  const link = `${window.location.origin}/join/${token}`

  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 권한이 없는 환경(비 HTTPS 등) — 사용자가 직접 복사하도록 선택 상태로 만든다
      document.getElementById('invite-link-input')?.select()
    }
  }

  // 생성자 본인은 이미 합류한 상태 → 1/n에서 시작
  const joined = 1
  const slots = Array.from({ length: project.headcount }, (_, i) => i < joined)

  return (
    <div className="flow-page">
      <header className="flow-top">
        <img src={logo} alt="" />
        <span>팀원 초대</span>
      </header>

      <div className="flow-card flow-center">
        <span className="invite-icon" aria-hidden="true">✓</span>
        <h1>계획이 확정되었습니다</h1>
        <p className="flow-muted">
          아래 링크를 팀원들에게 공유하세요. 링크로 들어온 팀원은 바로 가입하고 설문에 참여합니다.
        </p>

        <div className="invite-link-row">
          <input id="invite-link-input" value={link} readOnly aria-label="초대 링크" />
          <button
            type="button"
            className={`invite-copy${copied ? ' copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '복사됨' : '복사'}
          </button>
        </div>

        <div className="join-status">
          <div className="join-status-head">
            <strong>참여 현황</strong>
            <span>{joined} / {project.headcount}명</span>
          </div>
          <div className="slot-list">
            {slots.map((filled, i) => (
              <span key={i} className={`slot${filled ? ' filled' : ''}`}>
                {filled ? '나 (생성자)' : '대기 중'}
              </span>
            ))}
          </div>
          <p className="flow-muted">
            팀원이 링크로 합류하면 이 목록이 채워집니다. 전원이 설문을 제출하면 역할이 배정됩니다.
          </p>
        </div>

        <div className="flow-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`/join/${token}`)}
          >
            팀원 화면 미리보기
          </button>
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => navigate('/app/dashboard')}
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
