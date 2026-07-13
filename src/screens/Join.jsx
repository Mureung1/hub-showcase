import { useParams, Link } from 'react-router'
import './Auth.css'

/* 초대 링크 착지 페이지 — 팀 미리보기·즉시 가입은 4단계에서 구현 */
export default function Join() {
  const { token } = useParams()

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <h1>팀 초대</h1>
          <p>초대 링크로 접속하셨습니다. 팀 합류 기능은 준비 중입니다.</p>
          <p className="auth-terms">초대 코드: {token}</p>
        </div>
        <div className="auth-divider" />
        <p className="auth-switch">
          <Link to="/">홈으로 돌아가기</Link>
        </p>
      </div>
    </div>
  )
}
