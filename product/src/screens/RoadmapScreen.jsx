import { useEffect, useMemo, useState } from 'react'
import TopBar from '../components/TopBar'
import AnalysisNotice from '../components/AnalysisNotice'
import ScopeSwitch from '../components/ScopeSwitch'
import SectionNav from '../components/SectionNav'
import useScrollSpy from '../hooks/useScrollSpy'
import usePostings from '../hooks/usePostings'
import { fetchJson, isJobNotReady } from '../hooks/apiFetch'
import { DEFAULT_CLUSTER, apiScope } from '../data/clusters'
import { HELD_LABEL, recompose } from '../data/recompose'

// 05 준비 로드맵 — 로드맵 슬라이스.
// 범위(전체/기업군/개별 공고/내가 입력한 공고)와 체크 상태를 입력으로 프로젝트/학습 두
// 트랙을 보여준다. 체크는 즉시 저장되고, 로드맵 재구성은 적용 버튼으로 반영한다.
//
// 재조합의 주인은 범위에 따라 다르다. 저장된 범위(전체·기업군·개별 공고)는 지금처럼
// POST /api/roadmap 이 재조합해 준다. 붙여넣은 공고는 서버가 조회할 수 있는 산출물이 아니라
// 이미 받아 둔 payload 라서, 같은 규칙을 옮긴 data/recompose.js 가 화면에서 재조합한다.
// 직무는 App 이 내려주는 job prop({ job_role_id, display_name })을 쓴다.
// 범위를 고르는 자리는 맨 위 ScopeSwitch 하나뿐이다 — 기업군 칩과 공고 목록도 그 안에 있다.
// 공고 목록은 기업군 응답이 아니라 hooks/usePostings(직무 전체)가 받아 그 블록으로 넘긴다.

const PRIO = { vhigh: ['우선순위 매우 높음', 'prio--vhigh'], high: ['우선순위 높음', 'prio--high'], mid: ['우선순위 중간', 'prio--mid'], track: ['전형 대비 · 별도 트랙', 'prio--mid'] }
const KIND_LABEL = { project: '프로젝트', story: '서사', study: '학습 · 면접' }
const NAV_IDS = ['overview', 'project', 'study', 'sync']
const NAV_ITEMS = [['overview', '로드맵 개요'], ['project', '프로젝트 로드맵'], ['study', '학습 로드맵'], ['sync', '체크리스트 갱신']]
const EMPTY_CHECKS = Object.freeze({})

// 적용한 체크를 범위별로 가르는 키.
// 직무 전체 범위는 기업군과 무관하다. ScopeSwitch 가 되돌아올 자리를 기억하려고 cluster_tag 를
// 남겨 두므로, 키에서는 그 값을 빼야 기업군을 거쳐 갈 때마다 적용 상태가 갈리지 않는다.
const scopeToKey = (scope) => `${scope.level}:${scope.level === 'overall' ? '' : (scope.cluster_tag || '')}:${scope.posting_id || ''}`

function fetchRoadmap(jobRoleId, scope, checks, signal) {
  return fetchJson('/api/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job: jobRoleId, scope, checks: checks || {} }),
    signal,
  })
}

function RoadmapScreen({ go, job, checks, setChecks, scope, setScope, myPosting }) {
  const jobRoleId = job.job_role_id
  const level = scope.level
  const cluster = scope.cluster_tag || DEFAULT_CLUSTER
  const postingId = scope.posting_id
  const ck = checks || {}
  const scopeKey = scopeToKey(scope)
  // 붙여넣은 공고의 저장된 로드맵. 재조합 전 원본이며 체크 초기값도 여기서 세운다.
  const mineRoadmap = level === 'mine' && myPosting ? myPosting.roadmap : null
  const [data, setData] = useState(null)
  const [appliedByScope, setAppliedByScope] = useState(() => ({ [scopeKey]: checks || {} }))
  const applied = appliedByScope[scopeKey] || EMPTY_CHECKS
  const [status, setStatus] = useState('loading')
  const activeSection = useScrollSpy(NAV_IDS)
  // 공고 선택지는 범위와 무관한 직무 전체 목록이다. 기업군 응답에 딸려 오지 않는다.
  const { postings, status: postingsStatus, retry: retryPostings } = usePostings(jobRoleId)

  // 붙여넣은 공고의 재조합. 서버가 하는 것과 같은 조건으로 부른다 —
  // 체크가 비어 있으면 저장된 payload 를 그대로 쓰고, 있으면 recompose 를 한 번 적용한다.
  const mineView = useMemo(() => {
    if (!mineRoadmap) return null
    return Object.keys(applied).length > 0 ? recompose(mineRoadmap, applied) : mineRoadmap
  }, [mineRoadmap, applied])

  useEffect(() => {
    if (mineRoadmap) {
      // 이미 받아 둔 결과다. 체크 초기값만 payload 에서 세우고 요청은 건너뛴다.
      setChecks((prev) => prev ?? Object.fromEntries((mineRoadmap.check_rows || []).map((row) => [row.item_id, row.source_step === HELD_LABEL])))
      return undefined
    }
    const controller = new AbortController()
    fetchRoadmap(
      jobRoleId,
      apiScope({ level, cluster_tag: cluster, posting_id: postingId }),
      applied,
      controller.signal
    )
      .then((json) => {
        setData(json)
        setChecks((prev) => prev ?? Object.fromEntries(json.check_rows.map((row) => [row.item_id, row.source_step === HELD_LABEL])))
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        // 활성 분석 결과가 없는 직무는 오류가 아니라 "아직 준비 안 됨"으로 안내한다.
        setStatus(isJobNotReady(error.code) ? 'notready' : 'error')
      })
    return () => controller.abort()
  }, [jobRoleId, level, cluster, postingId, applied, mineRoadmap, setChecks])

  // 그릴 payload 는 하나다 — 붙여넣은 공고 결과이거나 서버가 준 범위 결과다.
  const view = mineView || data
  // 붙여넣은 공고 범위에는 요청이 없으므로 로딩·오류 상태도 없다. 체크 적용도 즉시 끝난다.
  const viewStatus = mineView ? 'ready' : status

  const pendingCount = view
    ? view.check_rows.filter((r) => !!ck[r.item_id] !== !!applied[r.item_id]).length
    : 0

  const applyChecks = () => {
    setStatus('loading')
    setAppliedByScope((prev) => ({ ...prev, [scopeKey]: { ...ck } }))
  }

  // 범위 전환. 스크롤은 건드리지 않는다 — 바꾼 자리에 그대로 있어야 무엇이 바뀌었는지 보인다.
  const changeScope = (nextScope) => {
    const nextKey = scopeToKey(nextScope)
    setStatus('loading')
    setAppliedByScope((prev) => (prev[nextKey] ? prev : { ...prev, [nextKey]: {} }))
    setScope(nextScope)
  }

  if (viewStatus === 'notready') {
    return (
      <>
        <TopBar step={5} label="준비 로드맵" job={job.display_name} backTo="checklist" backLabel="합격 전략" go={go} />
        <main className="app-shell reader-layout">
          <AnalysisNotice jobName={job.display_name} onBack={() => go('select')} />
        </main>
      </>
    )
  }
  if (viewStatus === 'error') {
    return (
      <>
        <TopBar step={5} label="준비 로드맵" job={job.display_name} backTo="checklist" backLabel="합격 전략" go={go} />
        <main className="app-shell reader-layout">
          <p className="status-panel status-panel--error">로드맵 서버에 연결하지 못했습니다. server(4000)와 agent(8000)를 확인해 주세요.</p>
        </main>
      </>
    )
  }

  const steps = view?.project_steps || []
  const studies = view?.study_tracks || []
  const rows = view?.check_rows || []
  const totalWeeks = steps.reduce((a, s) => a + s.weeks, 0)
  const fillCount = rows.filter((r) => r.source_step !== HELD_LABEL).length
  const haveRows = rows.filter((r) => ck[r.item_id])

  return (
    <>
      <TopBar step={5} label="준비 로드맵" job={job.display_name} backTo="checklist" backLabel="합격 전략" go={go} />
      <main className="app-shell reader-layout">
        <article className="page page--wide">
          <header className="report-header" id="top">
            <span className="eyebrow">미보유 항목 → 우선순위 로드맵</span>
            <h1>막연한 공부 목록이 아니라, 필수부터 채우는 순서표를 드립니다.</h1>
            <p>체크리스트의 미보유 항목을 채우는 프로젝트·학습을 배치했습니다. 각 단계가 끝나면 어떤 합격 전략 항목이 채워지는지 함께 표시합니다.</p>
          </header>

          <ScopeSwitch
            scope={scope}
            jobLabel={job.display_name}
            postings={postings}
            postingsStatus={postingsStatus}
            onRetryPostings={retryPostings}
            myPosting={myPosting}
            payloadScope={view?.scope}
            onSelect={changeScope}
          />

          {viewStatus === 'loading' && <p className="status-panel">로드맵을 구성하는 중입니다…</p>}

          {viewStatus === 'ready' && view && (
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
                      <div className={`mc-row${changed ? ' mc-row--changed' : ''}${r.source_step === HELD_LABEL && ck[r.item_id] ? ' mc-row--done' : ''}`} key={r.item_id}>
                        <button type="button" aria-label="보유 여부"
                          className={`mc-box${ck[r.item_id] ? ' mc-box--on' : ''}`}
                          onClick={() => setChecks((prev) => ({ ...(prev || {}), [r.item_id]: !(prev || {})[r.item_id] }))}>
                          {ck[r.item_id] ? '✓' : ''}
                        </button>
                        <span className="mc-name">
                          {r.title}
                          {r.is_deviation && <i className="mc-tag mc-tag--dev">추가 요구 {['①', '②', '③'][r.dev_n - 1] || ''}</i>}
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

        <SectionNav label="로드맵" ariaLabel="로드맵 목차" items={NAV_ITEMS} active={activeSection} />
      </main>
    </>
  )
}

export default RoadmapScreen
