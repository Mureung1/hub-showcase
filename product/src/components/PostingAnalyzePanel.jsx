import { useEffect, useRef, useState } from 'react'
import './posting-analyze.css'

// 내 공고 직접 분석 패널.
// 사용자가 붙여넣은 공고 원문을 POST /api/postings/analyze 로 보내고,
// 해석은 이 화면의 기존 공고 해석 UI(PostingInterpretation)를 그대로 재사용한다.
// 전략·로드맵은 요약 카드로만 보여 주고 상세는 합격 전략 화면으로 넘긴다.

export const MIN_CHARS = 200
export const MAX_CHARS = 12000

const CONF_LABEL = { high: '신뢰도 높음', mid: '신뢰도 중간', low: '신뢰도 낮음' }

// 신뢰도 배지. 기존 공고 해석 UI 와 같은 클래스를 쓴다.
export function ConfBadge({ level }) {
  return <span className={`conf conf--${level}`}>{CONF_LABEL[level] || level}</span>
}

// 개별 공고 해석 UI. 기업군 공고 상세와 사용자 입력 공고가 공유한다.
// posting 은 interpretation payload 의 posting 객체 형태다.
export function PostingInterpretation({ posting, jobLabel, footer }) {
  const [annTab, setAnnTab] = useState('deviation') // deviation | baseline | signal

  if (!posting) return null

  const interpretations = posting.interpretations || []
  const baselineNotes = posting.baseline_notes || []
  const signalNotes = posting.signal_notes || []

  return (
    <div className="posting-layout">
      <div className="posting-raw">
        <h4>공고 원문 · {posting.company}</h4>
        {(posting.raw_sections || []).map((sec) => (
          <div key={sec.section}>
            <h5>{sec.section}</h5>
            {sec.lines.map((line, i) => (
              <div className="raw-line" key={i}>
                <p>
                  ·{' '}
                  {line.mark_n && <mark className="mark--dev">{line.text}<sup>{line.mark_n}</sup></mark>}
                  {line.note_n && <mark className="mark--signal">{line.text}<sup>{line.note_n}</sup></mark>}
                  {line.base_n && <>{line.text}<sup className="sup-base">{line.base_n}</sup></>}
                  {!line.mark_n && !line.note_n && !line.base_n && line.text}
                  {line.base_ref && <span className="raw-base">baseline · {line.base_ref}</span>}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="interp-stack">
        {posting.summary && (
          <div className="interp-card interp-card--sum">
            <h4>{posting.summary.title}</h4>
            <p>{posting.summary.body}</p>
            <div className="interp-meta">
              <ConfBadge level={posting.summary.confidence} />
              {posting.summary.ratio && <span className="ratio-pill">{posting.summary.ratio}</span>}
            </div>
          </div>
        )}
        <div className="ann-tabs">
          <button type="button" className={`ann-tab ann-tab--base${annTab === 'baseline' ? ' is-on' : ''}`} onClick={() => setAnnTab('baseline')}><i className="ann-dot"></i>{jobLabel} 공통 {baselineNotes.length}</button>
          <button type="button" className={`ann-tab ann-tab--sig${annTab === 'signal' ? ' is-on' : ''}`} onClick={() => setAnnTab('signal')}><i className="ann-dot"></i>숨은 의미 {signalNotes.length}</button>
          <button type="button" className={`ann-tab ann-tab--dev${annTab === 'deviation' ? ' is-on' : ''}`} onClick={() => setAnnTab('deviation')}><i className="ann-dot"></i>{posting.company} 특징 {interpretations.length}</button>
        </div>
        {annTab === 'deviation' && interpretations.map((it) => (
          <div className="interp-card" key={it.n}>
            <h4><span className="interp-num interp-num--dev">{it.n}</span>{it.title}</h4>
            <p>{it.body}</p>
            <div className="interp-meta">
              <ConfBadge level={it.confidence} />
              {it.ratio && <span className="ratio-pill">{it.ratio}</span>}
              {(it.sources || []).some((s) => s.type === 'company_blog') && <span className="stat-pill">근거: 공고 + 회사 블로그</span>}
            </div>
          </div>
        ))}
        {annTab === 'baseline' && baselineNotes.map((b) => (
          <div className="interp-card interp-card--base" key={b.n}>
            <h4><span className="interp-num interp-num--base">{b.n}</span>{b.base_ref}</h4>
            <p>{b.body}</p>
          </div>
        ))}
        {annTab === 'signal' && signalNotes.map((s) => (
          <div className="interp-card interp-card--sig" key={s.n}>
            <h4><span className="interp-num interp-num--sig">{s.n}</span>{s.title}</h4>
            <p>{s.body}</p>
          </div>
        ))}
        {posting.unchanged_note && <div className="fold-note">{posting.unchanged_note}</div>}
        {footer}
      </div>
    </div>
  )
}

// 온디맨드 분석이 막힌 경우(503) 보여 주는 직무 일반 결과.
function GeneralFallback({ fallback, jobLabel }) {
  const baseline = fallback?.baseline || []
  const deviations = fallback?.deviations || []
  if (baseline.length === 0 && deviations.length === 0) return null
  return (
    <div className="pa-summary-grid">
      <div className="pa-card">
        <h4>{jobLabel} 공통 기대치</h4>
        <p>공고별 해석 대신 직무 baseline 을 그대로 보여 줍니다.</p>
        <ul className="pa-list">
          {baseline.slice(0, 5).map((b) => (
            <li key={b.item_id}><b>{b.title}</b> — {b.desc}</li>
          ))}
        </ul>
      </div>
      <div className="pa-card">
        <h4>기업군 편차</h4>
        <p>선택한 기업군이 baseline 위에서 더 요구하는 지점입니다.</p>
        <ul className="pa-list">
          {deviations.slice(0, 5).map((d) => (
            <li key={d.item_id}><b>{d.topic}</b> — {d.deviation}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

async function analyzePosting(rawText, job, signal) {
  const res = await fetch('/api/postings/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw_text: rawText, job }),
    signal,
  })
  // 본문이 비었거나 JSON 이 아닐 수도 있다. 그 경우는 null 로 두고 상태 코드만 쓴다.
  const json = await res.json().catch(() => null)
  return { ok: res.ok, httpStatus: res.status, json }
}

function PostingAnalyzePanel({ job, jobLabel, fallback, go }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle')   // idle | loading | ready | degraded | error
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const controllerRef = useRef(null)

  // 언마운트 시 진행 중인 요청을 취소한다.
  useEffect(() => () => controllerRef.current?.abort(), [])

  const length = text.trim().length
  const tooShort = length > 0 && length < MIN_CHARS
  const tooLong = length > MAX_CHARS
  const canSubmit = length >= MIN_CHARS && !tooLong && status !== 'loading'

  const submit = async () => {
    if (!canSubmit) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setStatus('loading')
    setResult(null)
    setMessage('')
    try {
      const { ok, httpStatus, json } = await analyzePosting(text.trim(), job, controller.signal)
      if (controller.signal.aborted) return
      const code = json?.error?.code
      if (httpStatus === 503 && code === 'ONDEMAND_UNAVAILABLE') {
        // 온디맨드 실행이 불가능한 상태 — 직무 일반 결과로 대체한다.
        setResult(json?.interpretation ? json : null)
        setMessage(json?.error?.message || '')
        setStatus('degraded')
        return
      }
      if (!ok) throw new Error(json?.error?.message || `HTTP ${httpStatus}`)
      setResult(json)
      setStatus('ready')
    } catch (error) {
      if (error.name === 'AbortError' || controller.signal.aborted) return
      setMessage(error.message || '')
      setStatus('error')
    }
  }

  const reset = () => {
    controllerRef.current?.abort()
    setText('')
    setResult(null)
    setMessage('')
    setStatus('idle')
  }

  const posting = result?.interpretation?.posting || null
  const strategy = result?.strategy || null
  const roadmap = result?.roadmap || null
  const checklist = strategy?.checklist || []
  const steps = roadmap?.project_steps || []
  const tracks = roadmap?.study_tracks || []

  return (
    <>
      <div className="pa-form">
        <label className="pa-guide" htmlFor="pa-raw">
          공고 원문을 그대로 붙여넣으세요. 자격요건·우대사항·업무 내용을 함께 넣을수록 해석이 정확해집니다.
        </label>
        <textarea
          id="pa-raw"
          className="pa-textarea"
          rows={14}
          value={text}
          disabled={status === 'loading'}
          placeholder={'예)\n[담당업무]\n- 결제 서비스 API 설계 및 개발\n- 대용량 트래픽 처리와 성능 개선\n\n[자격요건]\n- Java/Spring 기반 개발 경험\n- RDBMS 이해와 쿼리 튜닝 경험\n\n[우대사항]\n- Kafka 등 메시지 큐 운영 경험\n- 모니터링·장애 대응 경험'}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="pa-meter">
          <span className={`pa-count${tooLong ? ' pa-count--over' : ''}`}>
            <b>{length.toLocaleString()}</b> / {MAX_CHARS.toLocaleString()}자 · 최소 {MIN_CHARS}자
          </span>
          <div className="pa-actions">
            {text && <button type="button" className="btn btn-secondary" onClick={reset} disabled={status === 'loading'}>지우기</button>}
            <button type="button" className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
              {status === 'loading' ? '분석하는 중…' : '이 공고 분석하기'}
            </button>
          </div>
        </div>
        {tooShort && <p className="pa-note">{MIN_CHARS}자 이상부터 분석할 수 있습니다. {MIN_CHARS - length}자 더 필요합니다.</p>}
        {tooLong && <p className="pa-note">{MAX_CHARS.toLocaleString()}자를 넘었습니다. {(length - MAX_CHARS).toLocaleString()}자를 줄여 주세요.</p>}
        <p className="pa-note">
          입력한 원문은 이메일·전화번호 같은 개인정보를 지우고 정규화한 뒤 해석에만 사용하며, 직무 통계 모집단에는 포함하지 않습니다.
        </p>
      </div>

      {status === 'loading' && <p className="pa-status">공고를 해석하고 전략·로드맵까지 다시 맞추는 중입니다…</p>}
      {status === 'error' && (
        <p className="pa-status pa-status--error">
          공고를 분석하지 못했습니다. 잠시 후 다시 시도해 주세요.{message && ` (${message})`}
        </p>
      )}

      {status === 'degraded' && (
        <>
          <p className="pa-status pa-status--warn">
            지금은 새 공고를 즉시 분석할 수 없어 이 공고만의 해석은 제공하지 못합니다.{message && ` (${message})`} 대신 아래 {jobLabel} 일반 결과를 확인해 주세요.
          </p>
          {posting
            ? <PostingInterpretation posting={posting} jobLabel={jobLabel} />
            : <GeneralFallback fallback={fallback} jobLabel={jobLabel} />}
        </>
      )}

      {status === 'ready' && result && (
        <>
          <div className="pa-result-head">
            <h3>붙여넣은 공고 해석</h3>
            {/* source 가 cache 면 사용자에게 알리지 않고 조용히 넘어간다. */}
            {result.source === 'agent' && <span className="pa-badge">새로 분석한 결과</span>}
            {result.matched === false && <span className="stat-pill">직무 자동 판별</span>}
          </div>

          {posting
            ? <PostingInterpretation posting={posting} jobLabel={jobLabel} />
            : <p className="pa-status">이 공고에서는 개별 해석 문장을 뽑지 못했습니다. 원문에 자격요건·우대사항이 들어 있는지 확인해 주세요.</p>}

          {(strategy || roadmap) && (
            <div className="pa-summary-grid">
              {strategy && (
                <div className="pa-card">
                  <h4>합격 전략 요약</h4>
                  <p>이 공고 기준으로 다시 정리한 준비 항목입니다.</p>
                  <div className="pa-metric-row">
                    <div className="pa-metric"><b>{checklist.length}</b><span>체크 항목</span></div>
                    <div className="pa-metric"><b>{checklist.filter((c) => c.required).length}</b><span>필수 항목</span></div>
                    <div className="pa-metric"><b>{(strategy.interview || []).length}</b><span>예상 질문</span></div>
                  </div>
                  <ul className="pa-list">
                    {checklist.slice(0, 3).map((c) => (
                      <li key={c.item_id}><b>{c.title}</b> — {c.subtitle || c.reason}</li>
                    ))}
                  </ul>
                  <div className="pa-card-foot">
                    <button type="button" className="btn btn-primary" onClick={() => go('checklist')}>합격 전략 화면에서 이어 보기 →</button>
                  </div>
                </div>
              )}
              {roadmap && (
                <div className="pa-card">
                  <h4>준비 로드맵 요약</h4>
                  <p>미체크 항목을 채우는 순서를 제안합니다.</p>
                  <div className="pa-metric-row">
                    <div className="pa-metric"><b>{steps.length}</b><span>프로젝트 단계</span></div>
                    <div className="pa-metric"><b>{tracks.length}</b><span>학습 트랙</span></div>
                  </div>
                  <ul className="pa-list">
                    {steps.slice(0, 3).map((s) => (
                      <li key={s.n}><b>{s.title}</b>{s.weeks ? ` — ${s.weeks}` : ''}</li>
                    ))}
                  </ul>
                  <div className="pa-card-foot">
                    <button type="button" className="btn btn-secondary" onClick={() => go('roadmap')}>준비 로드맵 화면으로 →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

export default PostingAnalyzePanel
