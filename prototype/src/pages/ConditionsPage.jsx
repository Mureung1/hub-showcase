import { CONDITIONS } from '../mock/conditions.js'
import './ConditionsPage.css'

const STATUS_LABEL = { active: '감시 중', paused: '일시정지' }

export default function ConditionsPage() {
  return (
    <div className="page">
      <div className="topbar">
        <span className="brand">🔦 Beacon</span>
        <span className="crumb">· 조건 관리</span>
      </div>
      <h1>조건 관리</h1>
      <p className="caption cond-intro">
        Discord에서 <code>/알림</code> 으로 자연어 조건을 걸면 여기에 쌓입니다.
      </p>

      <div className="cond-list">
        {CONDITIONS.map((c) => (
          <div key={c.id} className="card cond-card">
            <div className="cond-head">
              <div className="cond-name">
                {c.symbolName}{' '}
                <span className="mono cond-ticker">{c.symbol}</span>
              </div>
              <span
                className={`status ${c.status === 'active' ? 'active' : 'pending'}`}
              >
                {STATUS_LABEL[c.status]}
              </span>
            </div>
            <div className="cond-raw">“{c.raw}”</div>
            <div className="cond-meta">
              <span className="pill">{c.rule}</span>
              <span className="caption">
                등록 {c.created_at}
                {c.last_fired ? ` · 최근 알림 ${c.last_fired}` : ' · 알림 없음'}
              </span>
            </div>
            <div className="cond-actions">
              <button className="btn cond-del">삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
