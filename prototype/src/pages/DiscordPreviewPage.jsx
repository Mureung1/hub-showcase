import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './DiscordPreviewPage.css'

// Discord 경험 데모 — 발표자가 클릭으로 넘기는 인터랙티브 채팅.
// 자연어 조건 입력 → AI 파싱 확인 → (감시) → 조건 충족 알림(+과거 복기 메모리)
// → 원클릭 기록(매수/매도/관망) → 웹(저널)로 이어짐.
// Discord 표면은 항상 다크이므로 Discord 자체 팔레트(dc-*)를 로컬로 쓰고,
// Beacon accent(그린)만 브랜드 토큰(var(--accent))으로 흘려보낸다.

const CONDITION_TEXT = '삼성전자가 8만원 되면 알려줘'

const RECORD = {
  buy: { label: '📥 매수 기록', bubble: '📥 매수 기록', confirm: '✅ 매수 10주 @ 80,100원 저널에 기록했어요.' },
  sell: { label: '📤 매도 기록', bubble: '📤 매도 기록', confirm: '✅ 매도 기록을 저장했어요.' },
  hold: { label: '👀 관망 기록', bubble: '👀 관망 기록', confirm: '👀 관망으로 기록했어요. 이번엔 진입을 보류했습니다.' },
}

function Typing() {
  return (
    <div className="msg">
      <div className="dp-avatar">🔦</div>
      <div className="dp-typing" aria-label="입력 중">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  )
}

function BotHead({ time }) {
  return (
    <div className="dp-head">
      <span className="dp-name">Beacon</span>
      <span className="dp-bot">BOT</span>
      <span className="dp-time">{time}</span>
    </div>
  )
}

export default function DiscordPreviewPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [typing, setTyping] = useState(false)
  const [recordType, setRecordType] = useState(null)
  const [draft, setDraft] = useState(CONDITION_TEXT)
  const [userMsg, setUserMsg] = useState(CONDITION_TEXT)
  const timer = useRef(null)

  const typeThen = (next) => {
    setTyping(true)
    timer.current = setTimeout(() => {
      setTyping(false)
      setStep(next)
    }, 700)
  }

  const send = () => {
    setUserMsg(draft.trim() || CONDITION_TEXT)
    setStep(1)
    typeThen(2)
  }
  const confirm = () => {
    setStep(3)
    typeThen(4)
  }
  const record = (type) => {
    setRecordType(type)
    setStep(5)
    typeThen(6)
  }
  const goWeb = () =>
    navigate('/journal/005930', { state: { fromDiscord: recordType } })

  const reset = () => {
    if (timer.current) clearTimeout(timer.current)
    setTyping(false)
    setRecordType(null)
    setDraft(CONDITION_TEXT)
    setUserMsg(CONDITION_TEXT)
    setStep(0)
  }

  return (
    <div className="page discord-preview">
      <div className="topbar">
        <span className="brand">🔦 Beacon</span>
        <span className="crumb">· Discord 경험 데모</span>
      </div>
      <div className="dp-title-row">
        <h1>Discord 경험</h1>
        {step > 0 && (
          <button className="btn dp-reset" onClick={reset}>
            ↺ 처음부터
          </button>
        )}
      </div>
      <p className="caption dp-intro">
        말을 걸어 조건을 등록하고, 조건이 충족되면 과거 복기 메모리와 함께 알림이
        도착합니다. 버튼 한 번으로 기록하고 웹에서 복기까지 이어집니다.
      </p>

      <div className="channel">
        <div className="channel-name">
          # beacon-알림 <span>· 나만 볼 수 있음</span>
        </div>

        <div className="dp-log">
          {/* 1. 사용자: 자연어 조건 */}
          {step >= 1 && (
            <div className="msg user">
              <div className="dp-bubble user">{userMsg}</div>
              <div className="dp-avatar user">🙂</div>
            </div>
          )}

          {/* 2. 봇: 파싱 확인 */}
          {step >= 2 && (
            <div className="msg">
              <div className="dp-avatar">🔦</div>
              <div className="dp-body">
                <BotHead time="오후 12:02" />
                <div className="dp-text">조건을 이렇게 이해했어요. 맞나요?</div>
                <div className="embed parse">
                  <div className="fields">
                    <div>
                      <div className="field-label">종목</div>
                      <div className="field-value">삼성전자 (005930)</div>
                    </div>
                    <div>
                      <div className="field-label">조건</div>
                      <div className="field-value">현재가 ≥ 80,000원</div>
                    </div>
                  </div>
                  {step === 2 ? (
                    <div className="dp-buttons">
                      <button className="dp-btn confirm pulse" onClick={confirm}>
                        ✅ 확정
                      </button>
                      <button className="dp-btn ghost" onClick={reset}>
                        ✕ 취소
                      </button>
                    </div>
                  ) : (
                    <div className="dp-chosen">✅ 확정함</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. 사용자: 확정 */}
          {step >= 3 && (
            <div className="msg user">
              <div className="dp-bubble user">확정할게요</div>
              <div className="dp-avatar user">🙂</div>
            </div>
          )}

          {/* 4. 봇: 등록 완료 + 감시 구분선 + 조건 충족 알림 */}
          {step >= 4 && (
            <>
              <div className="msg">
                <div className="dp-avatar">🔦</div>
                <div className="dp-body">
                  <BotHead time="오후 12:02" />
                  <div className="dp-text">
                    ✅ 조건을 등록했어요. 지금부터 삼성전자를 감시할게요.
                  </div>
                </div>
              </div>

              <div className="dp-divider">
                <span>감시 중 · 2시간 후</span>
              </div>

              <div className="msg">
                <div className="dp-avatar">🔦</div>
                <div className="dp-body">
                  <BotHead time="오후 2:14" />
                  <div className="embed">
                    <div className="embed-title">
                      🔔 조건 충족 — 삼성전자 (005930)
                    </div>
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
                        지난번 이 조건으로 샀을 때{' '}
                        <b>"성급하게 추격매수했다"</b>고 복기했었죠. 이번엔 한
                        박자 기다려볼까요?
                      </span>
                    </div>
                    {step === 4 ? (
                      <div className="dp-buttons">
                        <button
                          className="dp-btn buy pulse"
                          onClick={() => record('buy')}
                        >
                          {RECORD.buy.label}
                        </button>
                        <button
                          className="dp-btn sell"
                          onClick={() => record('sell')}
                        >
                          {RECORD.sell.label}
                        </button>
                        <button
                          className="dp-btn hold"
                          onClick={() => record('hold')}
                        >
                          {RECORD.hold.label}
                        </button>
                        <button className="dp-btn link" onClick={goWeb}>
                          웹에서 열기 ↗
                        </button>
                      </div>
                    ) : (
                      <div className="dp-chosen">
                        {recordType ? RECORD[recordType].bubble + ' 선택' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 5. 사용자: 기록 버튼 클릭 */}
          {step >= 5 && recordType && (
            <div className="msg user">
              <div className="dp-bubble user">{RECORD[recordType].bubble}</div>
              <div className="dp-avatar user">🙂</div>
            </div>
          )}

          {/* 6. 봇: 기록 확인 + 웹으로 이어가기 */}
          {step >= 6 && recordType && (
            <div className="msg">
              <div className="dp-avatar">🔦</div>
              <div className="dp-body">
                <BotHead time="오후 2:14" />
                <div className="dp-text">{RECORD[recordType].confirm}</div>
                <button className="dp-btn continue pulse" onClick={goWeb}>
                  저널에서 메모·복기 이어가기 →
                </button>
              </div>
            </div>
          )}

          {typing && <Typing />}
        </div>

        {/* 컴포저 */}
        {step === 0 && (
          <div className="dp-composer">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="예: 삼성전자가 8만원 되면 알려줘"
            />
            <button className="dp-send pulse" onClick={send}>
              전송
            </button>
          </div>
        )}
      </div>

      <p className="caption dp-foot">
        발표자가 강조된 버튼을 클릭해 단계를 진행합니다 · 프로토타입(목데이터)
      </p>
    </div>
  )
}
