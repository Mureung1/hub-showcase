import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import useScrollSpy from '../hooks/useScrollSpy'
import { SUPPORTED_JOB } from '../data/mock'

// 03 채용공고 해설 화면.
// 세 섹션(전체 baseline / 기업군 편차 / 개별 공고)을 항상 표시한다.
// 데이터는 POST /api/reverse 실통신(에이전트 fixture + DB 공고 목록)으로 받는다.

const CLUSTERS = ['핀테크·금융', '빅테크·플랫폼', '스타트업', 'B2B SaaS', 'SI·대기업', '게임사']
const CONF_LABEL = { high: '신뢰도 높음', mid: '신뢰도 중간', low: '신뢰도 낮음' }
const NAV_IDS = ['baseline', 'cluster', 'posting']

async function fetchReverse(scope, signal) {
  const res = await fetch('/api/reverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job: 'backend', scope }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function ConfBadge({ level }) {
  return <span className={`conf conf--${level}`}>{CONF_LABEL[level] || level}</span>
}

function ReverseScreen({ go, scope, setScope }) {
  const cluster = scope.cluster_tag || '핀테크·금융'
  const postingId = scope.level === 'posting' ? scope.posting_id : null
  const [data, setData] = useState(null)          // cluster 범위 응답
  const [detail, setDetail] = useState(null)      // posting 범위 응답
  const [search, setSearch] = useState('')
  const [annTab, setAnnTab] = useState('deviation') // deviation | baseline | signal
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [detailStatus, setDetailStatus] = useState(postingId ? 'loading' : 'idle')
  const activeSection = useScrollSpy(NAV_IDS)

  useEffect(() => {
    const controller = new AbortController()
    fetchReverse({ level: 'cluster', cluster_tag: cluster }, controller.signal)
      .then((json) => { setData(json); setStatus('ready') })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error') })
    return () => controller.abort()
  }, [cluster])

  useEffect(() => {
    if (!postingId) return undefined
    const controller = new AbortController()
    fetchReverse({ level: 'posting', cluster_tag: cluster, posting_id: postingId }, controller.signal)
      .then((json) => { setDetail(json.posting); setDetailStatus('ready') })
      .catch((error) => { if (error.name !== 'AbortError') setDetailStatus('error') })
    return () => controller.abort()
  }, [cluster, postingId])

  const selectPosting = (nextPostingId) => {
    if (nextPostingId === postingId) {
      // 같은 공고를 다시 누르면 접는다
      setDetail(null)
      setDetailStatus('idle')
      setScope({ level: 'cluster', cluster_tag: cluster, posting_id: null })
      return
    }
    setDetail(null)
    setDetailStatus('loading')
    setScope({ level: 'posting', cluster_tag: cluster, posting_id: nextPostingId })
  }

  const selectCluster = (nextCluster) => {
    setStatus('loading')
    setDetail(null)
    setDetailStatus('idle')
    setScope({ level: 'cluster', cluster_tag: nextCluster, posting_id: null })
  }

  if (status === 'error') {
    return (
      <>
        <TopBar step={3} label="채용공고 해설" job={SUPPORTED_JOB} backTo="stats" backLabel="통계" go={go} />
        <main className="app-shell reader-layout">
          <p className="status-panel status-panel--error">
            공고 해설 서버에 연결하지 못했습니다. server(4000)와 agent(8000)가 켜져 있는지 확인해 주세요.
          </p>
        </main>
      </>
    )
  }

  const allPostings = data?.postings_in_cluster || []
  const filtered = search
    ? allPostings.filter((p) => (p.company + p.title).toLowerCase().includes(search.toLowerCase()))
    : allPostings

  return (
    <>
      <TopBar step={3} label="채용공고 해설" job={SUPPORTED_JOB} backTo="stats" backLabel="통계" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="top">
            <span className="eyebrow">통계 items 기반 · 직무 기준선 대비 편차 해설{data && ` · ${data.source === 'fixture' ? '표본 해설' : 'AI 해설'}`}</span>
            <h1>공고가 반복하는 문장 뒤에서, 이 회사·기업군이 유독 원하는 지점을 되짚습니다.</h1>
            <p>전체는 직군 공통 기대치(baseline)를, 기업군·개별 공고는 그 기준 위에서 더 높거나 추가로 요구되는 편차를 근거·신뢰도와 함께 보여 줍니다.</p>
          </header>

          {status === 'loading' && <p className="status-panel">채용공고를 해설하는 중입니다…</p>}

          {status === 'ready' && data && (
            <>
              {/* 섹션 1 · 전체 baseline */}
              <section className="section-block" id="baseline">
                <div className="section-title">
                  <h2>백엔드 신입 공통 기대치 (baseline)</h2>
                  <span className="hint">회사와 무관한 기준선 · 통계 근거 병기</span>
                </div>
                <div className="baseline-grid">
                  {data.baseline.map((b) => (
                    <div className="baseline-card" key={b.item_id}>
                      <h3>{b.title}</h3>
                      <p>{b.desc}</p>
                      <div className="baseline-stat">
                        {b.freq_pct != null && <span className="stat-pill">등장 {b.freq_pct}%</span>}
                        {b.required_ratio != null && (
                          <span className={`stat-pill${b.required_ratio >= 50 ? ' stat-pill--req' : ''}`}>필수율 {b.required_ratio}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 섹션 2 · 기업군 편차 */}
              <section className="section-block" id="cluster">
                <div className="section-title">
                  <h2>기업군이 baseline 위에서 더 요구하는 것</h2>
                  <span className="hint">기업군을 고르면 이 섹션과 아래 개별 공고가 바뀝니다</span>
                </div>
                <div className="cluster-chips">
                  {CLUSTERS.map((c) => (
                    <button key={c} type="button" className={`scope-chip${c === cluster ? ' scope-chip--on' : ''}`} onClick={() => selectCluster(c)}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="dev-grid">
                  {data.deviations.map((d) => (
                    <article className={`dev-card${d.baseline === '공통 항목에 없음' ? ' dev-card--new' : ''}`} key={d.item_id}>
                      <div className="dev-head"><h3>{d.topic}</h3><ConfBadge level={d.confidence} /></div>
                      <div className="dev-levels">
                        <div className="lv"><span className="lv-label">BASELINE</span><span>{d.baseline}</span></div>
                        <div className="lv"><span className="lv-label lv-label--diff">{d.baseline === '공통 항목에 없음' ? '신규 +' : '편차 ↑'}</span><span><b>{d.deviation}</b></span></div>
                      </div>
                      <p className="dev-evidence">{d.evidence}</p>
                      <p className="dev-desc">{d.explanation}</p>
                      <div className="dev-foot">
                        <span className="ratio-pill">{d.ratio}</span>
                        {d.related_stat && <button type="button" className="dev-link" onClick={() => go('stats')}>통계 근거 보기 →</button>}
                      </div>
                    </article>
                  ))}
                </div>
                {data.unchanged.length > 0 && (
                  <>
                    <div className="section-title section-title--sub"><h2 className="subhead">편차 없음 — baseline 그대로 적용</h2></div>
                    <div className="baseline-grid">
                      {data.unchanged.map((u) => (
                        <div className="baseline-card baseline-card--muted" key={u.item_id}>
                          <h3>{u.title}</h3>
                          <p>{u.note}</p>
                          <div className="baseline-stat"><span className="stat-pill">편차 없음</span></div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* 섹션 3 · 개별 공고 */}
              <section className="section-block" id="posting">
                <div className="section-title">
                  <h2>개별 공고 — 원문과 해설을 나란히</h2>
                  <span className="hint">하이라이트 = baseline보다 높거나 baseline에 없는 요구 문장</span>
                </div>
                <input
                  className="posting-search"
                  type="text"
                  placeholder="회사·공고명 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <p className="posting-count">
                  {cluster} 공고 전체 {allPostings.length}건{search && ` · 검색 결과 ${filtered.length}건`}
                </p>
                <div className="posting-list">
                  {filtered.length === 0 && <p className="posting-empty">조건에 맞는 공고가 없습니다.</p>}
                  {filtered.map((p) => (
                    <button
                      key={p.posting_id}
                      type="button"
                      className={`posting-row${p.posting_id === postingId ? ' posting-row--on' : ''}`}
                      onClick={() => selectPosting(p.posting_id)}
                    >
                      <span className="co">{p.company}</span>
                      <span className="ti">{p.title}</span>
                      <span className="dt">{p.posted_at}</span>
                    </button>
                  ))}
                </div>

                {detailStatus === 'loading' && <p className="status-panel">공고를 해설하는 중입니다…</p>}
                {detailStatus === 'error' && <p className="status-panel status-panel--error">선택한 공고 해설을 불러오지 못했습니다.</p>}

                {detail && (
                  <div className="posting-layout">
                    <div className="posting-raw">
                      <h4>공고 원문 · {detail.company}</h4>
                      {detail.raw_sections.map((sec) => (
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
                      <div className="interp-card interp-card--sum">
                        <h4>{detail.summary.title}</h4>
                        <p>{detail.summary.body}</p>
                        <div className="interp-meta"><ConfBadge level={detail.summary.confidence} />{detail.summary.ratio && <span className="ratio-pill">{detail.summary.ratio}</span>}</div>
                      </div>
                      <div className="ann-tabs">
                        <button type="button" className={`ann-tab ann-tab--base${annTab === 'baseline' ? ' is-on' : ''}`} onClick={() => setAnnTab('baseline')}><i className="ann-dot"></i>{SUPPORTED_JOB} 공통 {detail.baseline_notes.length}</button>
                        <button type="button" className={`ann-tab ann-tab--sig${annTab === 'signal' ? ' is-on' : ''}`} onClick={() => setAnnTab('signal')}><i className="ann-dot"></i>숨은 의미 {detail.signal_notes.length}</button>
                        <button type="button" className={`ann-tab ann-tab--dev${annTab === 'deviation' ? ' is-on' : ''}`} onClick={() => setAnnTab('deviation')}><i className="ann-dot"></i>{detail.company} 특징 {detail.interpretations.length}</button>
                      </div>
                      {annTab === 'deviation' && detail.interpretations.map((it) => (
                        <div className="interp-card" key={it.n}>
                          <h4><span className="interp-num interp-num--dev">{it.n}</span>{it.title}</h4>
                          <p>{it.body}</p>
                          <div className="interp-meta">
                            <ConfBadge level={it.confidence} />
                            {it.ratio && <span className="ratio-pill">{it.ratio}</span>}
                            {it.sources.some((s) => s.type === 'company_blog') && <span className="stat-pill">근거: 공고 + 회사 블로그</span>}
                          </div>
                        </div>
                      ))}
                      {annTab === 'baseline' && detail.baseline_notes.map((b) => (
                        <div className="interp-card interp-card--base" key={b.n}>
                          <h4><span className="interp-num interp-num--base">{b.n}</span>{b.base_ref}</h4>
                          <p>{b.body}</p>
                        </div>
                      ))}
                      {annTab === 'signal' && detail.signal_notes.map((s) => (
                        <div className="interp-card interp-card--sig" key={s.n}>
                          <h4><span className="interp-num interp-num--sig">{s.n}</span>{s.title}</h4>
                          <p>{s.body}</p>
                        </div>
                      ))}
                      <div className="fold-note">{detail.unchanged_note}</div>
                      <div className="posting-input-note"><b>공고 직접 입력</b> — 다른 공고 원문을 붙여넣으면 같은 방식으로 개별 해설합니다.</div>
                    </div>
                  </div>
                )}
              </section>

              <div className="nav-actions">
                <button className="btn btn-secondary" onClick={() => go('stats')}>← 통계 다시 보기</button>
                <button className="btn btn-primary" onClick={() => go('checklist')}>합격 전략 보기 →</button>
              </div>
            </>
          )}
        </article>

        <aside className="floating-nav" aria-label="채용공고 해설 목차">
          <p className="floating-nav__label">공고 해설</p>
          {[['baseline', '전체 baseline'], ['cluster', '기업군 편차'], ['posting', '개별 공고 해설']].map(([id, label]) => (
            <a key={id} className={activeSection === id ? 'is-current' : ''} href={`#${id}`}><span className="dot"></span>{label}</a>
          ))}
        </aside>
      </main>
    </>
  )
}

export default ReverseScreen
