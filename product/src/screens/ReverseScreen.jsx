import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import AnalysisNotice from '../components/AnalysisNotice'
import PostingAnalyzePanel, { ConfBadge, PostingInterpretation } from '../components/PostingAnalyzePanel'
import useScrollSpy from '../hooks/useScrollSpy'
import { fetchJson, isJobNotReady } from '../hooks/apiFetch'
import { CLUSTERS, DEFAULT_CLUSTER } from '../data/clusters'

// 03 채용공고 해석 화면.
// 네 섹션(전체 baseline / 기업군 편차 / 개별 공고 / 내 공고 직접 분석)을 항상 표시한다.
// 데이터는 POST /api/reverse 실통신(저장된 활성 결과 + DB 공고 목록)으로 받는다.
// 직무는 App 이 내려주는 job prop({ job_role_id, display_name })을 쓴다.

const NAV_IDS = ['baseline', 'cluster', 'posting', 'my-posting']

function fetchReverse(jobRoleId, scope, signal) {
  return fetchJson('/api/reverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job: jobRoleId, scope }),
    signal,
  })
}

function ReverseScreen({ go, scope, setScope, job }) {
  const jobRoleId = job.job_role_id
  const jobLabel = job.display_name
  const cluster = scope.cluster_tag || DEFAULT_CLUSTER
  const postingId = scope.level === 'posting' ? scope.posting_id : null
  const [data, setData] = useState(null)          // cluster 범위 응답
  const [detail, setDetail] = useState(null)      // posting 범위 응답
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('loading') // loading | ready | error | notready
  const [detailStatus, setDetailStatus] = useState(postingId ? 'loading' : 'idle')
  const activeSection = useScrollSpy(NAV_IDS)

  useEffect(() => {
    const controller = new AbortController()
    fetchReverse(jobRoleId, { level: 'cluster', cluster_tag: cluster }, controller.signal)
      .then((json) => { setData(json); setStatus('ready') })
      .catch((error) => {
        if (error.name === 'AbortError') return
        // 활성 분석 결과가 없는 직무는 오류가 아니라 "아직 준비 안 됨"으로 안내한다.
        setStatus(isJobNotReady(error.code) ? 'notready' : 'error')
      })
    return () => controller.abort()
  }, [jobRoleId, cluster])

  useEffect(() => {
    if (!postingId) return undefined
    const controller = new AbortController()
    fetchReverse(jobRoleId, { level: 'posting', cluster_tag: cluster, posting_id: postingId }, controller.signal)
      .then((json) => { setDetail(json.posting); setDetailStatus('ready') })
      .catch((error) => { if (error.name !== 'AbortError') setDetailStatus('error') })
    return () => controller.abort()
  }, [jobRoleId, cluster, postingId])

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

  if (status === 'notready') {
    return (
      <>
        <TopBar step={3} label="채용공고 해석" job={jobLabel} backTo="stats" backLabel="통계" go={go} />
        <main className="app-shell reader-layout">
          <AnalysisNotice jobName={jobLabel} onBack={() => go('select')} />
        </main>
      </>
    )
  }
  if (status === 'error') {
    return (
      <>
        <TopBar step={3} label="채용공고 해석" job={jobLabel} backTo="stats" backLabel="통계" go={go} />
        <main className="app-shell reader-layout">
          <p className="status-panel status-panel--error">
            공고 해석 서버에 연결하지 못했습니다. server(4000)와 agent(8000)가 켜져 있는지 확인해 주세요.
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
      <TopBar step={3} label="채용공고 해석" job={jobLabel} backTo="stats" backLabel="통계" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="top">
            <span className="eyebrow">통계 items 기반 · 직무 기준선 대비 편차 해석{data && ` · ${data.source === 'fixture' ? '표본 해석' : 'AI 해석'}`}</span>
            <h1>공고가 반복하는 문장 뒤에서, 이 회사·기업군이 유독 원하는 지점을 되짚습니다.</h1>
            <p>전체는 직군 공통 기대치(baseline)를, 기업군·개별 공고는 그 기준 위에서 더 높거나 추가로 요구되는 편차를 근거·신뢰도와 함께 보여 줍니다.</p>
          </header>

          {status === 'loading' && <p className="status-panel">채용공고를 해석하는 중입니다…</p>}

          {status === 'ready' && data && (
            <>
              {/* 섹션 1 · 전체 baseline */}
              <section className="section-block" id="baseline">
                <div className="section-title">
                  <h2>{jobLabel} 신입 공통 기대치 (baseline)</h2>
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
                  <h2>개별 공고 — 원문과 해석을 나란히</h2>
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

                {detailStatus === 'loading' && <p className="status-panel">공고를 해석하는 중입니다…</p>}
                {detailStatus === 'error' && <p className="status-panel status-panel--error">선택한 공고 해석을 불러오지 못했습니다.</p>}

                {detail && (
                  <PostingInterpretation
                    key={detail.posting_id}
                    posting={detail}
                    jobLabel={jobLabel}
                    footer={<div className="posting-input-note"><b>공고 직접 입력</b> — 아래 <a href="#my-posting">내 공고 직접 분석</a>에 원문을 붙여넣으면 같은 방식으로 해석합니다.</div>}
                  />
                )}
              </section>

              {/* 섹션 4 · 내 공고 직접 분석 (직무 선택 화면에는 두지 않는다) */}
              <section className="section-block" id="my-posting">
                <div className="section-title">
                  <h2>내 공고 직접 분석</h2>
                  <span className="hint">지원하려는 공고 원문을 붙여넣으면 같은 기준으로 해석합니다</span>
                </div>
                <PostingAnalyzePanel
                  job={jobRoleId}
                  jobLabel={jobLabel}
                  fallback={{ baseline: data.baseline, deviations: data.deviations }}
                  go={go}
                />
              </section>

              <div className="nav-actions">
                <button className="btn btn-secondary" onClick={() => go('stats')}>← 통계 다시 보기</button>
                <button className="btn btn-primary" onClick={() => go('checklist')}>합격 전략 보기 →</button>
              </div>
            </>
          )}
        </article>

        <aside className="floating-nav" aria-label="채용공고 해석 목차">
          <p className="floating-nav__label">공고 해석</p>
          {[['baseline', '전체 baseline'], ['cluster', '기업군 편차'], ['posting', '개별 공고 해석'], ['my-posting', '내 공고 직접 분석']].map(([id, label]) => (
            <a key={id} className={activeSection === id ? 'is-current' : ''} href={`#${id}`}><span className="dot"></span>{label}</a>
          ))}
        </aside>
      </main>
    </>
  )
}

export default ReverseScreen
