import { useEffect, useState } from 'react'
import TopBar from '../components/TopBar'
import useScrollSpy from '../hooks/useScrollSpy'
import { SUPPORTED_JOB } from '../data/mock'

// 05 준비 로드맵 — 로드맵 슬라이스.
// 범위(전체/기업군/개별 공고)와 체크 상태를 입력으로 프로젝트/학습 두 트랙을 보여준다.
// 체크는 즉시 저장되고, 로드맵 재구성은 적용 버튼으로 반영한다.

const CLUSTERS = ['핀테크·금융', '빅테크·플랫폼', '스타트업', 'B2B SaaS', 'SI·대기업', '게임사']
const PRIO = { vhigh: ['우선순위 매우 높음', 'prio--vhigh'], high: ['우선순위 높음', 'prio--high'], mid: ['우선순위 중간', 'prio--mid'], track: ['전형 대비 · 별도 트랙', 'prio--mid'] }
const KIND_LABEL = { project: '프로젝트', story: '서사', study: '학습 · 면접' }
const NAV_IDS = ['overview', 'project', 'study', 'sync']
const EMPTY_CHECKS = Object.freeze({})

const scopeToKey = (scope) => `${scope.level}:${scope.cluster_tag || ''}:${scope.posting_id || ''}`

async function fetchRoadmap(scope, checks, signal) {
  const res = await fetch('/api/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job: 'backend', scope, checks: checks || {} }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function RoadmapScreen({ go, checks, setChecks, scope, setScope }) {
  const level = scope.level
  const cluster = scope.cluster_tag || '핀테크·금융'
  const postingId = scope.posting_id
  const ck = checks || {}
  const scopeKey = scopeToKey(scope)
  const [data, setData] = useState(null)
  const [appliedByScope, setAppliedByScope] = useState(() => ({ [scopeKey]: checks || {} }))
  const applied = appliedByScope[scopeKey] || EMPTY_CHECKS
  const [status, setStatus] = useState('loading')
  const activeSection = useScrollSpy(NAV_IDS)

  useEffect(() => {
    const controller = new AbortController()
    fetchRoadmap(
      { level, cluster_tag: level === 'overall' ? null : cluster, posting_id: level === 'posting' ? postingId : null },
      applied,
      controller.signal
    )
      .then((json) => {
        setData(json)
        setChecks((prev) => prev ?? Object.fromEntries(json.check_rows.map((row) => [row.item_id, row.source_step === '보유'])))
        setStatus('ready')
      })
      .catch((error) => { if (error.name !== 'AbortError') setStatus('error') })
    return () => controller.abort()
  }, [level, cluster, postingId, applied, setChecks])

  const pendingCount = data
    ? data.check_rows.filter((r) => !!ck[r.item_id] !== !!applied[r.item_id]).length
    : 0

  const applyChecks = () => {
    setStatus('loading')
    setAppliedByScope((prev) => ({ ...prev, [scopeKey]: { ...ck } }))
  }

  const changeScope = (nextScope) => {
    const nextKey = scopeToKey(nextScope)
    setStatus('loading')
    setAppliedByScope((prev) => (prev[nextKey] ? prev : { ...prev, [nextKey]: {} }))
    setScope(nextScope)
  }

  if (status === 'error') {
    return (
      <>
        <TopBar step={5} label="준비 로드맵" job={SUPPORTED_JOB} backTo="checklist" backLabel="합격 전략" go={go} />
        <main className="app-shell reader-layout">
          <p className="status-panel status-panel--error">로드맵 서버에 연결하지 못했습니다. server(4000)와 agent(8000)를 확인해 주세요.</p>
        </main>
      </>
    )
  }

  const steps = data?.project_steps || []
  const studies = data?.study_tracks || []
  const rows = data?.check_rows || []
  const totalWeeks = steps.reduce((a, s) => a + s.weeks, 0)
  const fillCount = rows.filter((r) => r.source_step !== '보유').length
  const haveRows = rows.filter((r) => ck[r.item_id])
  const postings = data?.postings_in_cluster || []

  return (
    <>
      <TopBar step={5} label="준비 로드맵" job={SUPPORTED_JOB} backTo="checklist" backLabel="합격 전략" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="top">
            <span className="eyebrow">미보유 항목 → 우선순위 로드맵</span>
            <h1>막연한 공부 목록이 아니라, 필수부터 채우는 순서표를 드립니다.</h1>
            <p>체크리스트의 미보유 항목을 채우는 프로젝트·학습을 배치했습니다. 각 단계가 끝나면 어떤 합격 전략 항목이 채워지는지 함께 표시합니다.</p>
            <div className="cluster-chips">
              <button type="button" className={`scope-chip${level === 'overall' ? ' scope-chip--on' : ''}`} onClick={() => changeScope({ level: 'overall', cluster_tag: null, posting_id: null })}>{SUPPORTED_JOB} 전체 기준</button>
              {CLUSTERS.map((c) => (
                <button key={c} type="button"
                  className={`scope-chip${level !== 'overall' && c === cluster ? ' scope-chip--on' : ''}`}
                  onClick={() => changeScope({ level: 'cluster', cluster_tag: c, posting_id: null })}>
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
                      if (level === 'posting' && p.posting_id === postingId) changeScope({ level: 'cluster', cluster_tag: cluster, posting_id: null })
                      else changeScope({ level: 'posting', cluster_tag: cluster, posting_id: p.posting_id })
                    }}>
                    <span className="co">{p.company}</span>
                    <span className="ti">{p.title}</span>
                    <span className="dt">{p.posted_at}</span>
                  </button>
                ))}
              </div>
            )}
          </header>

          {status === 'loading' && <p className="status-panel">로드맵을 구성하는 중입니다…</p>}

          {status === 'ready' && data && (
            <>
              {/* 블록 1 · 개요 */}
              <section className="section-block" id="overview">
                <div className="metric-grid metric-grid--4">
                  <div className="metric-card"><span className="num">{steps.length}<small>단계</small></span><span className="caption">프로젝트 로드맵 (필수 우선 정렬)</span></div>
                  <div className="metric-card"><span className="num">{totalWeeks}<small>주</small></span><span className="caption">예상 총 기간</span></div>
                  <div className="metric-card"><span className="num">{fillCount}<small>개</small></span><span className="caption">채워지는 항목 (프로젝트·학습)</span></div>
                  <div className="metric-card"><span className="num">{haveRows.length}<small>개</small></span><span className="caption">보유 체크됨 — 아래 완료 표시</span></div>
                </div>
                {haveRows.length > 0 && (
                  <div className="done-strip">
                    <b>보유 항목 ✓</b>
                    {haveRows.map((r) => <span className="done-chip" key={r.item_id}>✓ {r.title}</span>)}
                    <span className="done-hint">— 보유 항목은 로드맵에서 제외되고, 소개 방법만 다듬습니다.</span>
                  </div>
                )}
              </section>

              {/* 블록 2 · 프로젝트 로드맵 */}
              <section className="section-block" id="project">
                <div className="section-title">
                  <h2>프로젝트 로드맵</h2>
                  <span className="hint">경험을 만든다 — 포트폴리오·자소서로 증명 · 순서가 중요</span>
                </div>
                <div className="timeline">
                  {steps.map((s, i) => (
                    <div className="tl-item" key={s.n}>
                      <div className="tl-rail">
                        <div className="tl-dot">{s.n}</div>
                        {i < steps.length - 1 && <div className="tl-line"></div>}
                      </div>
                      <div className="rc-card">
                        <div className="rc-top"><span className="rc-phase">{s.phase}</span><span className={`prio ${PRIO[s.priority][1]}`}>{PRIO[s.priority][0]}</span></div>
                        <h3>{s.title}</h3>
                        <p>{s.body}</p>
                        <div className="rc-deliver"><b>산출물</b> — {s.deliverable}</div>
                        <div className="fills">
                          {s.fills.map((f) => <span key={f.item_id} className={`fill-chip${f.kind === 'dev' ? ' fill-chip--dev' : ''}`}>채워짐: {f.label}</span>)}
                        </div>
                        <div className="reason"><b>{s.reason_title}</b>{s.reason}</div>
                        <div className="tag-list">{s.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 블록 3 · 학습 로드맵 */}
              <section className="section-block" id="study">
                <div className="section-title">
                  <h2>학습 로드맵</h2>
                  <span className="hint">이해를 만든다 — 면접에서 검증 · 프로젝트와 병행</span>
                </div>
                <div className="study-grid">
                  {studies.map((st) => (
                    <div className="study-card" key={st.title}>
                      <div className="rc-top"><span className="rc-phase">{st.phase}</span><span className={`prio ${PRIO[st.priority][1]}`}>{PRIO[st.priority][0]}</span></div>
                      <h3>{st.title}</h3>
                      <p className="study-depth"><b>어디까지</b> — {st.depth}</p>
                      <div className="reason"><b>{st.reason_title}</b>{st.reason}</div>
                      {st.fills.length > 0 && (
                        <div className="fills">
                          {st.fills.map((f) => <span key={f.item_id} className="fill-chip fill-chip--study">채워짐: {f.label}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* 블록 4 · 체크리스트 갱신 */}
              <section className="section-block" id="sync">
                <div className="section-title">
                  <h2>이 로드맵이 채우는 체크리스트</h2>
                  <span className="hint">합격 전략 화면과 같은 체크 상태를 공유합니다</span>
                </div>
                <div className="mini-check">
                  {rows.map((r) => {
                    const changed = !!ck[r.item_id] !== !!applied[r.item_id]
                    return (
                      <div className={`mc-row${changed ? ' mc-row--changed' : ''}${r.source_step === '보유' && ck[r.item_id] ? ' mc-row--done' : ''}`} key={r.item_id}>
                        <button type="button" aria-label="보유 여부"
                          className={`mc-box${ck[r.item_id] ? ' mc-box--on' : ''}`}
                          onClick={() => setChecks((prev) => ({ ...(prev || {}), [r.item_id]: !(prev || {})[r.item_id] }))}>
                          {ck[r.item_id] ? '✓' : ''}
                        </button>
                        <span className="mc-name">
                          {r.title}
                          {r.is_deviation && <i className="mc-tag mc-tag--dev">편차 {['①', '②', '③'][r.dev_n - 1] || ''}</i>}
                          <i className={`mc-tag${r.kind === 'study' ? ' mc-tag--study' : ''}`}>{KIND_LABEL[r.kind] || r.kind}</i>
                          {!r.required && <i className="mc-tag">우대</i>}
                          {changed && <i className="mc-tag mc-tag--new">변경됨</i>}
                        </span>
                        <span className="mc-from">{r.source_step}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="apply-bar">
                  <span className="apply-note">체크는 즉시 저장됩니다 · 위 현황 숫자는 바로 갱신 · 로드맵 재정렬은 적용을 눌러야 반영됩니다</span>
                  <button className="apply-btn" disabled={pendingCount === 0} onClick={applyChecks}>
                    {pendingCount > 0 ? `변경 ${pendingCount}건 반영해 로드맵 다시 정렬` : '반영할 변경 없음'}
                  </button>
                </div>
              </section>

              <div className="nav-actions">
                <button className="btn btn-secondary" onClick={() => go('checklist')}>← 합격 전략으로</button>
                <button className="btn btn-primary" onClick={() => go('select')}>처음부터 다시 →</button>
              </div>
            </>
          )}
        </article>

        <aside className="floating-nav" aria-label="로드맵 목차">
          <p className="floating-nav__label">로드맵</p>
          {[['overview', '로드맵 개요'], ['project', '프로젝트 로드맵'], ['study', '학습 로드맵'], ['sync', '체크리스트 갱신']].map(([id, label]) => (
            <a key={id} className={activeSection === id ? 'is-current' : ''} href={`#${id}`}><span className="dot"></span>{label}</a>
          ))}
        </aside>
      </main>
    </>
  )
}

export default RoadmapScreen
