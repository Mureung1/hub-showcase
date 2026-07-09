import './DiscordPreviewPage.css'

// Discord 알림 메시지 미리보기 (mockups/discord-alert.html 컴포넌트화).
// Discord 표면은 항상 다크이므로 Discord 자체 팔레트(dc-*)를 로컬로 쓰고,
// Beacon accent(보라)만 브랜드 토큰(var(--accent))으로 흘려보낸다.
export default function DiscordPreviewPage() {
  return (
    <div className="page discord-preview">
      <div className="topbar">
        <span className="brand">🔦 Beacon</span>
        <span className="crumb">· Discord 알림 미리보기</span>
      </div>
      <h1>Discord 알림</h1>
      <p className="caption dp-intro">
        조건 충족 시 과거 복기 메모리 한 줄과 원클릭 기록 버튼이 함께 도착합니다.
      </p>

      <div className="channel">
        <div className="channel-name">
          # beacon-알림 <span>· 나만 볼 수 있음</span>
        </div>
        <div className="msg">
          <div className="dp-avatar">🔦</div>
          <div className="dp-body">
            <div className="dp-head">
              <span className="dp-name">Beacon</span>
              <span className="dp-bot">BOT</span>
              <span className="dp-time">오늘 오후 2:14</span>
            </div>
            <div className="embed">
              <div className="embed-title">🔔 조건 충족 — 삼성전자 (005930)</div>
              <div className="fields">
                <div>
                  <div className="field-label">설정한 조건</div>
                  <div className="field-value">80,000원 도달</div>
                </div>
                <div>
                  <div className="field-label">현재가</div>
                  <div className="field-value up">80,100원 ▲</div>
                </div>
              </div>
              <div className="memory">
                <span>💭</span>
                <span>
                  지난번 이 조건으로 샀을 때 <b>"성급하게 추격매수했다"</b>고
                  복기했었죠. 이번엔 한 박자 기다려볼까요?
                </span>
              </div>
              <div className="dp-buttons">
                <button className="dp-btn buy">📥 매수 기록</button>
                <button className="dp-btn sell">📤 매도 기록</button>
                <button className="dp-btn link">웹에서 열기 ↗</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
