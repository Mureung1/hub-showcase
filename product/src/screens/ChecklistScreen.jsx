import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import useScrollSpy from '../hooks/useScrollSpy'
import { SUPPORTED_JOB } from '../data/mock'

// 04 합격 조건 — 합격조건 슬라이스.
// 범위(전체/기업군/개별 공고)에 따라 체크리스트·포폴·자소서·면접 전략이 바뀐다.
// 데이터는 POST /api/conditions 실통신(통계→역산→합격조건 사슬 + fixture 전략)으로 받는다.

const CLUSTERS = ['핀테크·금융', '빅테크·플랫폼', '스타트업', 'B2B SaaS', 'SI·대기업', '게임사']
const CH_LABEL = { essay: '자소서', portfolio: '포트폴리오', interview: '면접' }

async function fetchConditions(scope) {
  const res = await fetch('/api/conditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job: 'backend', scope }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function ChecklistScreen({ go, checks, setChecks, scope, setScope }) {
  // 범위·체크 상태는 App이 소유한다 — 로드맵 화면과 공유
  const level = scope.level
  const cluster = scope.cluster_tag || '핀테크·금융'
  const postingId = scope.posting_id
  const ck = checks || {}
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const activeSection = useScrollSpy(['summary', 'checklist', 'portfolio', 'essay', 'interview'])

  useEffect(() => {
    // 처음에만 전체 로딩 화면 — 범위 변경 시에는 이전 내용을 유지한 채 갱신
    setStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'))
    fetchConditions({ level, cluster_tag: level === 'overall' ? null : cluster, posting_id: level === 'posting' ? postingId : null })
      .then((json) => {
        setData(json)
        // 체크 상태가 아직 없을 때만 서버 초기값으로 채운다 (사용자 체크를 덮어쓰지 않음)
        setChecks((prev) => prev ?? Object.fromEntries(json.checklist.map((c) => [c.item_id, c.have])))
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [level, cluster, postingId])

  if (status === 'error') {
    return (
      <>
        <TopBar step={4} label="합격 조건" job={SUPPORTED_JOB} backTo="reverse" backLabel="역산" go={go} />
        <main className="app-shell reader-layout">
          <p className="status-panel status-panel--error">합격 조건 서버에 연결하지 못했습니다. server(4000)와 agent(8000)를 확인해 주세요.</p>
        </main>
      </>
    )
  }

  const list = data?.checklist || []
  const haveCnt = list.filter((c) => ck[c.item_id]).length
  const reqMissing = list.filter((c) => c.required && !ck[c.item_id]).length
  const prefMissing = list.filter((c) => !c.required && !ck[c.item_id]).length
  const postings = data?.postings_in_cluster || []

  return (
    <>
      <TopBar step={4} label="합격 조건" job={SUPPORTED_JOB} backTo="reverse" backLabel="역산" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="top">
            <span className="eyebrow">역산 결과 → 자소서·포트폴리오·면접 배정</span>
            <h1>준비할 것을 아는 데서 멈추지 않고, 어디에 어떻게 보여줄지까지 정합니다.</h1>
            <p>역산의 각 요구 항목을 증명하기 좋은 곳으로 배정했습니다. 보유 여부를 체크하면 미보유 항목이 준비 로드맵으로 넘어갑니다.</p>
            <div className="cluster-chips">
              <button type="button" className={`scope-chip${level === 'overall' ? ' scope-chip--on' : ''}`} onClick={() => setScope({ level: 'overall', cluster_tag: null, posting_id: null })}>{SUPPORTED_JOB} 전체 기준</button>
              {CLUSTERS.map((c) => (
                <button key={c} type="button"
                  className={`scope-chip${level !== 'overall' && c === cluster ? ' scope-chip--on' : ''}`}
                  onClick={() => setScope({ level: 'cluster', cluster_tag: c, posting_id: null })}>
                  {c}
                </button>
              ))}
            </div>
            {level !== 'overall' && postings.length > 0 && (
              <div className="posting-list posting-list--slim">
                {postings.map((p) => (
                  <button key={p.posting_id} type="button"
                    className={`posting-row${level === 'posting' && p.posting_id === postingId ? ' posting-row--on' : ''}`}
                    onClick={() => {
                      if (level === 'posting' && p.posting_id === postingId) setScope({ level: 'cluster', cluster_tag: cluster, posting_id: null })
                      else setScope({ level: 'posting', cluster_tag: cluster, posting_id: p.posting_id })
                    }}>
                    <span className="co">{p.company}</span>
                    <span className="ti">{p.title}</span>
                    <span className="dt">{p.posted_at}</span>
                  </button>
                ))}
              </div>
            )}
          </header>

          {status === 'loading' && <p className="status-panel">합격 조건을 정리하는 중입니다…</p>}

          {status === 'ready' && data && (
            <>
              {/* 블록 1 · 준비 현황 */}
              <section className="section-block" id="summary">
                <div className="metric-grid metric-grid--4">
                  <div className="metric-card"><span className="num">{list.length}<small>개</small></span><span className="caption">합격 조건 항목</span></div>
                  <div className="metric-card"><span className="num">{haveCnt}<small>개</small></span><span className="caption">이미 보유한 항목</span></div>
                  <div className="metric-card metric-card--alert"><span className="num">{reqMissing}<small>개</small></span><span className="caption">필수인데 미보유 — 로드맵 우선 배치</span></div>
                  <div className="metric-card"><span className="num">{prefMissing}<small>개</small></span><span className="caption">우대 미보유 — 여유 있을 때</span></div>
                </div>
              </section>

              {/* 블록 2 · 체크리스트 */}
              <section className="section-block" id="checklist">
                <div className="section-title">
                  <h2>합격 조건 체크리스트</h2>
                  <span className="hint">역산 편차 항목은 배경 강조 · 보유 칸을 눌러 체크</span>
                </div>
                <div className="panel panel--table">
                  <table className="check-table">
                    <thead>
                      <tr><th>요구 항목</th><th>왜 필요한가 (근거)</th><th>증명 산출물·활동</th><th>활용처</th><th>보유</th></tr>
                    </thead>
                    <tbody>
                      {list.map((c) => (
                        <tr key={c.item_id} className={c.is_deviation ? 'is-dev' : ''}>
                          <td className="check-item">
                            <b>{c.title}
                              <span className={`kind-tag kind-tag--${c.kind}`}>{{ project: '프로젝트', story: '서사', study: '학습' }[c.kind] || c.kind}</span>
                              {c.is_deviation && <span className="dev-tag">역산 편차 {['①', '②', '③'][c.dev_n - 1] || ''}</span>}
                              {!c.required && <span className="dev-tag dev-tag--pref">우대</span>}
                            </b>
                            {c.subtitle}
                          </td>
                          <td className="why">{c.reason}</td>
                          <td className="why">{c.evidence_needed}</td>
                          <td>{c.channels.map((ch) => <span key={ch} className={`ch-badge ch-${ch}`}>{CH_LABEL[ch]}</span>)}</td>
                          <td>
                            <button type="button" aria-label="보유 여부"
                              className={`have${ck[c.item_id] ? ' have--yes' : ''}`}
                              onClick={() => setChecks((prev) => ({ ...(prev || {}), [c.item_id]: !(prev || {})[c.item_id] }))}>
                              {ck[c.item_id] ? '✓' : ''}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="panel-note panel-note--pad">배정 규칙: 산출물로 증명 가능 → 포트폴리오, 가치관·과정 서사 → 자소서, 이론·학습 → 면접. 한 항목이 여러 곳에 갈 수 있습니다. <b>보유 체크는 저장되어 준비 로드맵에 반영됩니다.</b></p>
                </div>
              </section>

              {/* 블록 3 · 포트폴리오 전략 */}
              <section className="section-block" id="portfolio">
                <div className="section-title">
                  <h2>포트폴리오 전략</h2>
                  <span className="hint">강조점은 핵심만 선별해 제시합니다</span>
                </div>
                <div className="strategy-grid">
                  {data.portfolio.highlights.map((h, i) => (
                    <div className="strategy-card" key={i}>
                      <span className="kicker kicker--portfolio">강조점 {i + 1}</span>
                      <h3>{h.title}</h3>
                      <p>{h.body}</p>
                      <ul>{h.tips.map((t, j) => <li key={j}>{t}</li>)}</ul>
                      <span className="link-pill">체크리스트 연결: {h.linked_item_ids.map((id) => list.find((c) => c.item_id === id)?.title).filter(Boolean).join(', ')}</span>
                    </div>
                  ))}
                </div>
                <div className="panel panel--orders">
                  <div className="section-title"><h2 className="subhead">{data.portfolio.intro_orders.length > 1 ? '기업군별 소개 순서 — 같은 프로젝트, 다른 첫인상' : `${data.portfolio.intro_orders[0]?.cluster} 소개 순서`}</h2></div>
                  {data.portfolio.intro_orders.map((o) => (
                    <div className="order-row" key={o.cluster}>
                      <b className="order-cluster">{o.cluster}</b>
                      {o.steps.map((s, i) => (
                        <span key={s} className="order-wrap">
                          <span className={`order-step${i === 0 ? ' order-step--hot' : ''}`}>{s}</span>
                          {i < o.steps.length - 1 && <span className="order-arrow">→</span>}
                        </span>
                      ))}
                    </div>
                  ))}
                  <p className="panel-note">README 첫 화면과 자소서의 프로젝트 소개 순서를 지원 기업군에 맞춰 바꾸는 것만으로 같은 결과물이 다르게 읽힙니다.</p>
                </div>
              </section>

              {/* 블록 4 · 자소서 전략 */}
              <section className="section-block" id="essay">
                <div className="section-title">
                  <h2>자소서 전략</h2>
                  <span className="hint">문제 → 해결 → 성장 구조로</span>
                </div>
                <div className="strategy-grid">
                  {data.essay.map((e, i) => (
                    <div className="strategy-card" key={i}>
                      <span className="kicker kicker--essay">소재 {i + 1} · {e.kind === 'deviation' ? '편차 연결형' : '보유 소재 다듬기'}</span>
                      <h3>{e.title}</h3>
                      <p>{e.body}</p>
                      {e.narrative && (
                        <div className="narrative">
                          <div><b>문제</b>{e.narrative.problem}</div>
                          <div><b>해결</b>{e.narrative.solve}</div>
                          <div><b>성장</b>{e.narrative.growth}</div>
                        </div>
                      )}
                      {e.sample_sentence && <p className="sample-sentence">{e.sample_sentence}</p>}
                      {e.tips.length > 0 && <ul>{e.tips.map((t, j) => <li key={j}>{t}</li>)}</ul>}
                      <span className="link-pill">체크리스트 연결: {e.linked_item_ids.map((id) => list.find((c) => c.item_id === id)?.title).filter(Boolean).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 블록 5 · 면접 전략 */}
              <section className="section-block" id="interview">
                <div className="section-title">
                  <h2>면접 전략</h2>
                  <span className="hint">편차 항목은 꼬리질문으로 검증됩니다 — 두 번째 답을 준비</span>
                </div>
                <div className="strategy-grid">
                  {data.interview.map((q, i) => (
                    <div className="strategy-card" key={i}>
                      <span className="kicker kicker--interview">예상 질문 {i + 1} · {q.kicker}</span>
                      <div className="qa-tree">
                        <div className="qa-q">"{q.question}"</div>
                        {q.followups.map((f, j) => <div className="qa-follow" key={j}>"{f}"</div>)}
                      </div>
                      <p className="qa-point"><b>답변 포인트</b> — {q.point}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="nav-actions nav-actions--captioned">
                <button className="btn btn-secondary" onClick={() => go('reverse')}>← 역산 다시 보기</button>
                <div className="nav-go">
                  <button className="btn btn-primary" onClick={() => go('roadmap')}>준비 로드맵 보기 ({reqMissing + prefMissing}개 항목) →</button>
                  <p className="nav-caption">선택한 범위와 체크 상태를 기준으로 로드맵을 만듭니다</p>
                </div>
              </div>
            </>
          )}
        </article>

        <aside className="floating-nav" aria-label="합격 조건 목차">
          <p className="floating-nav__label">합격 조건</p>
          {[['summary', '준비 현황'], ['checklist', '체크리스트'], ['portfolio', '포트폴리오 전략'], ['essay', '자소서 전략'], ['interview', '면접 전략']].map(([id, label]) => (
            <a key={id} className={activeSection === id ? 'is-current' : ''} href={`#${id}`}><span className="dot"></span>{label}</a>
          ))}
        </aside>
      </main>
    </>
  )
}

export default ChecklistScreen
