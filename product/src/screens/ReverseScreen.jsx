import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import AnalysisNotice from '../components/AnalysisNotice'
import PostingAnalyzePanel, { ConfBadge, PostingInterpretation } from '../components/PostingAnalyzePanel'
import ScopeSwitch from '../components/ScopeSwitch'
import SectionNav from '../components/SectionNav'
import useScrollSpy from '../hooks/useScrollSpy'
import usePostings from '../hooks/usePostings'
import { jumpToSection } from '../hooks/sectionJump'
import { fetchJson, isJobNotReady } from '../hooks/apiFetch'
import { DEFAULT_CLUSTER } from '../data/clusters'

// 03 채용공고 해석 화면.
// 네 섹션(직무 공통 기대치 / 기업군이 더 요구하는 것 / 개별 공고 / 내 공고 직접 분석)을 항상 표시한다.
// 데이터는 POST /api/reverse 실통신(저장된 활성 결과 + DB 공고 목록)으로 받는다.
// 직무는 App 이 내려주는 job prop({ job_role_id, display_name })을 쓴다.
// 범위를 고르는 자리는 맨 위 ScopeSwitch 하나뿐이다 — 기업군 칩과 공고 목록도 그 안에 있다.
// 공고 목록은 기업군 응답이 아니라 hooks/usePostings(직무 전체)가 받아 그 블록으로 넘긴다.

const NAV_IDS = ['baseline', 'cluster', 'posting', 'my-posting']
const NAV_ITEMS = [['baseline', '직무 공통 기대치'], ['cluster', '공통 기대치와의 차이'], ['posting', '개별 공고 해석'], ['my-posting', '내 공고 직접 분석']]

function fetchReverse(jobRoleId, scope, signal) {
  return fetchJson('/api/reverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job: jobRoleId, scope }),
    signal,
  })
}

function ReverseScreen({ go, scope, setScope, job, myPosting, setMyPosting }) {
  const jobRoleId = job.job_role_id
  const jobLabel = job.display_name
  const cluster = scope.cluster_tag || DEFAULT_CLUSTER
  const postingId = scope.level === 'posting' ? scope.posting_id : null
  const [data, setData] = useState(null)          // cluster 범위 응답
  const [detail, setDetail] = useState(null)      // posting 범위 응답
  const [detailScope, setDetailScope] = useState(null) // 그 응답이 실제로 쓴 범위
  const [status, setStatus] = useState('loading') // loading | ready | error | notready
  const [detailStatus, setDetailStatus] = useState(postingId ? 'loading' : 'idle')
  // 공고 선택지는 범위와 무관한 직무 전체 목록이다. 기업군 응답에 딸려 오지 않는다.
  const { postings, status: postingsStatus, retry: retryPostings } = usePostings(jobRoleId)
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
      .then((json) => { setDetail(json.posting); setDetailScope(json.scope || null); setDetailStatus('ready') })
      .catch((error) => { if (error.name !== 'AbortError') setDetailStatus('error') })
    return () => controller.abort()
  }, [jobRoleId, cluster, postingId])

  // 범위 전환. ScopeSwitch 가 만든 다음 범위 한 벌을 그대로 받는다.
  // 스크롤은 건드리지 않는다 — 범위를 바꾼 자리에 그대로 있어야 무엇이 바뀌었는지 보인다.
  const changeScope = (next) => {
    const nextCluster = next.cluster_tag || DEFAULT_CLUSTER
    const nextPostingId = next.level === 'posting' ? next.posting_id : null
    // 기업군이 바뀌면 지금 그리고 있는 차이·공고 목록은 다른 기업군의 것이 된다.
    if (nextCluster !== cluster) setStatus('loading')
    setDetail(null)
    setDetailScope(null)
    setDetailStatus(nextPostingId ? 'loading' : 'idle')
    setScope(next)
  }

  // 붙여넣은 공고 범위로 다음 화면을 연다. 기업군 선택은 되돌아올 때를 위해 남겨 둔다.
  const openMine = (target) => go(target, { scope: { level: 'mine', cluster_tag: cluster, posting_id: null } })

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


  return (
    <>
      <TopBar step={3} label="채용공고 해석" job={jobLabel} backTo="stats" backLabel="통계" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="top">
            <span className="eyebrow">채용공고 통계 기반 · 직무 공통 기대치와 비교한 추가 요구</span>
            <h1>공고가 반복하는 문장 뒤에서, 이 회사·기업군이 유독 원하는 지점을 되짚습니다.</h1>
            <p>직무 전체에서는 공통 기대치를, 기업군·개별 공고에서는 그보다 더 높거나 새롭게 요구하는 항목을 근거·신뢰도와 함께 보여 줍니다.</p>
          </header>

          <ScopeSwitch
            scope={scope}
            jobLabel={jobLabel}
            postings={postings}
            postingsStatus={postingsStatus}
            onRetryPostings={retryPostings}
            myPosting={myPosting}
            payloadScope={detailScope}
            hint={scope.level === 'mine' ? '내가 입력한 공고의 해석은 아래 「내 공고 직접 분석」 섹션에 있습니다.' : null}
            onSelect={changeScope}
          />

          {status === 'loading' && <p className="status-panel">채용공고를 해석하는 중입니다…</p>}

          {status === 'ready' && data && (
            <>
              {/* 섹션 1 · 직무 공통 기대치 */}
              <section className="section-block" id="baseline">
                <div className="section-title">
                  <h2>{jobLabel} 신입 공통 기대치</h2>
                  <span className="hint">회사와 무관하게 반복되는 직무 전반 기대치 · 통계 근거 병기</span>
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

              {/* 섹션 2 · 직무 공통 기대치와의 차이 */}
              <section className="section-block" id="cluster">
                <div className="section-title">
                  <h2>{cluster} 기업군이 직무 공통 기대치보다 더 요구하는 것</h2>
                  <span className="hint">맨 위 범위 선택에서 기업군을 바꾸면 이 섹션이 바뀝니다</span>
                </div>
                <div className="dev-grid">
                  {data.deviations.map((d) => (
                    <article className={`dev-card${d.baseline === '공통 항목에 없음' ? ' dev-card--new' : ''}`} key={d.item_id}>
                      <div className="dev-head"><h3>{d.topic}</h3><ConfBadge level={d.confidence} /></div>
                      <div className="dev-levels">
                        <div className="lv"><span className="lv-label">직무 공통</span><span>{d.baseline}</span></div>
                        <div className="lv"><span className="lv-label lv-label--diff">{d.baseline === '공통 항목에 없음' ? '신규 +' : '더 요구 ↑'}</span><span><b>{d.deviation}</b></span></div>
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
                    <div className="section-title section-title--sub"><h2 className="subhead">공통 기대치와 차이 없음 — 직무 공통 기대치 그대로 적용</h2></div>
                    <div className="baseline-grid">
                      {data.unchanged.map((u) => (
                        <div className="baseline-card baseline-card--muted" key={u.item_id}>
                          <h3>{u.title}</h3>
                          <p>{u.note}</p>
                          <div className="baseline-stat"><span className="stat-pill">차이 없음</span></div>
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
                  <span className="hint">하이라이트 = 직무 공통 기대치보다 높거나 새롭게 요구하는 문장</span>
                </div>
                {!postingId && (
                  <p className="fold-note">
                    맨 위 범위 선택에서 <b>개별 공고</b>를 고르고 목록에서 공고를 누르면 이 자리에 원문과 해석이 나란히 열립니다.
                  </p>
                )}

                {detailStatus === 'loading' && <p className="status-panel">공고를 해석하는 중입니다…</p>}
                {detailStatus === 'error' && <p className="status-panel status-panel--error">선택한 공고 해석을 불러오지 못했습니다.</p>}

                {detail && (
                  <PostingInterpretation
                    key={detail.posting_id}
                    posting={detail}
                    footer={<div className="posting-input-note"><b>공고 직접 입력</b> — 아래 <a href="#my-posting" onClick={(event) => jumpToSection(event, 'my-posting')}>내 공고 직접 분석</a>에 원문을 붙여넣으면 같은 방식으로 해석합니다.</div>}
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
                  myPosting={myPosting}
                  setMyPosting={setMyPosting}
                  onOpenMine={openMine}
                />
              </section>

              <div className="nav-actions">
                <button className="btn btn-secondary" onClick={() => go('stats')}>← 통계 다시 보기</button>
                <button className="btn btn-primary" onClick={() => go('checklist')}>합격 전략 보기 →</button>
              </div>
            </>
          )}
        </article>

        <SectionNav label="공고 해석" ariaLabel="채용공고 해석 목차" items={NAV_ITEMS} active={activeSection} />
      </main>
    </>
  )
}

export default ReverseScreen
