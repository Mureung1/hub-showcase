import { useState } from 'react'
import { CLUSTERS, DEFAULT_CLUSTER } from '../data/clusters'
import { filterPostings, postingState, postingYear } from '../data/postingFilters'

// 해석·합격 전략·준비 로드맵 세 화면의 범위 선택을 혼자 맡는 블록.
//
// 예전에는 범위를 고르는 자리가 두 벌이었다. 이 줄의 칩과, 각 화면 본문의 기업군 칩·공고
// 목록이 같은 scope 를 서로 다른 생김새로 건드렸다. 무엇을 눌러 무엇이 바뀌는지 읽히지
// 않아, 기업군과 개별 공고를 번갈아 눌러도 같은 안내만 본다는 혼란이 나왔다.
// 그래서 선택은 전부 여기로 모으고 본문에서는 지웠다. 세 화면은 이 블록 하나만 쓴다.
//
// 공고 목록은 **기업군에 매이지 않는다**. 예전에는 지금 고른 기업군의 공고만 보여 주어,
// 공고 하나를 고르려면 기업군을 하나씩 눌러 봐야 했다. 기업군마다 최근 공고가 한 건뿐인
// 실제 데이터에서는 건수 조건에 걸려 검색칸도 나오지 않았다. 이제 3단은 직무의 공고
// 전체를 받아 검색칸을 늘 띄우고, 공고를 고르면 그 공고의 기업군까지 함께 올린다.
//
// 세 단이 위에서 아래로 좁혀 간다.
//   1단 범위 종류 — 직무 전체 / 기업군 / 개별 공고 / 내가 입력한 공고(있을 때만)
//   2단 기업군 여섯 — 1단이 기업군이나 개별 공고일 때만
//   3단 공고 목록 — 1단이 개별 공고일 때만
// 그 아래 한 줄이 "지금 보고 있는 범위" 를 문장으로 다시 밝힌다.
//
// props
//   scope           지금 요청한 범위 { level, cluster_tag, posting_id }
//   jobLabel        직무 표시명 (1단이 직무 전체일 때 문장에 쓴다)
//   postings        직무의 공고 전체 — hooks/usePostings 가 받은 목록
//                   [{ posting_id, company, title, posted_at, closed_at, status, cluster_id, cluster_tag }]
//   postingsStatus  그 목록의 상태 loading | ready | empty | error
//   myPosting       App 이 들고 있는 내가 입력한 공고 (없으면 1단의 네 번째를 감춘다)
//   payloadScope    지금 그리고 있는 payload 의 scope — 요청과 다르면 그 사실을 밝힌다
//   hint            화면이 덧붙이는 한 줄 안내 (없어도 된다)
//   onSelect        다음 범위를 App 의 scope 로 올린다

const KIND_LABEL = {
  overall: '직무 전체',
  cluster: '기업군',
  posting: '개별 공고',
  mine: '내가 입력한 공고',
}

// 2단 기업군 칩의 "전체" 선택지. 3단 목록을 기업군으로 좁히지 않는다는 뜻이다.
const ALL_CLUSTERS = '전체'

// 분석된 개별 공고가 하나도 없을 때의 안내. 오류를 떠들지 않고 이 한 줄만 낸다.
const NO_POSTINGS = '분석된 개별 공고가 없습니다'

// 폴백 안내에 쓰는 범위 이름.
const SCOPE_LEVEL_LABEL = { cluster: '기업군', overall: '전체' }

// scope 한 벌에서 1단 선택값을 읽는다. `mine` 은 서버 계약에 없는 화면 전용 값이다.
function kindOf(scope) {
  if (scope.level === 'mine') return 'mine'
  if (scope.level === 'overall') return 'overall'
  if (scope.level === 'posting') return 'posting'
  return 'cluster'
}

// 같은 범위인지. 같은 칩을 다시 눌렀을 때 화면이 요청 없이 로딩 상태에 갇히지 않게 한다.
function sameScope(a, b) {
  return a.level === b.level
    && (a.cluster_tag || null) === (b.cluster_tag || null)
    && (a.posting_id || null) === (b.posting_id || null)
}

// 한 단을 감싸는 껍데기. 왼쪽에 단 이름, 오른쪽에 고를 것들.
function ScopeTier({ label, children }) {
  return (
    <div className="scope-switch__tier">
      <span className="scope-switch__tier-label">{label}</span>
      {children}
    </div>
  )
}

// 1단 — 범위 종류. 분석된 개별 공고가 없으면 개별 공고 칩은 누를 수 없다.
function KindChips({ kind, hasMine, postingDisabled, onPick }) {
  const kinds = hasMine ? ['overall', 'cluster', 'posting', 'mine'] : ['overall', 'cluster', 'posting']
  return (
    <ScopeTier label="범위">
      <div className="scope-switch__chips" role="group" aria-label="범위 종류">
        {kinds.map((k) => {
          const disabled = k === 'posting' && postingDisabled
          return (
            <button
              key={k}
              type="button"
              className={`scope-chip${k === kind ? ' scope-chip--on' : ''}`}
              aria-pressed={k === kind}
              disabled={disabled}
              title={disabled ? NO_POSTINGS : undefined}
              onClick={() => onPick(k)}
            >
              {KIND_LABEL[k]}
            </button>
          )
        })}
      </div>
    </ScopeTier>
  )
}

// 2단 — 기업군 여섯.
//
// 1단이 기업군이면 이 칩이 곧 범위 선택이다. 1단이 개별 공고이면 3단 목록을 좁히는
// 거르개로도 쓰이므로, 좁히기를 풀 수 있게 `전체` 를 앞에 하나 더 둔다.
function ClusterChips({ cluster, withAll, onPick }) {
  const options = withAll ? [ALL_CLUSTERS, ...CLUSTERS] : CLUSTERS
  return (
    <ScopeTier label="기업군">
      <div className="scope-switch__chips" role="group" aria-label="기업군">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            className={`scope-chip${c === cluster ? ' scope-chip--on' : ''}`}
            aria-pressed={c === cluster}
            onClick={() => onPick(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </ScopeTier>
  )
}

// 3단 — 직무의 공고 목록. 검색어는 범위가 아니라 이 목록만의 상태라 여기 둔다.
//
// 검색칸은 건수와 상관없이 늘 낸다. 짧은 목록에서 감췄더니 기업군마다 최근 공고가 한
// 건뿐인 데이터에서는 영영 나오지 않아 공고를 찾을 길이 사라졌다.
// 회사명·공고 제목·기업군 표시명 셋으로 걸러진다.
function PostingPicker({ postings, postingId, clusterFilter, status, onPick, onRetry }) {
  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const query = search.trim()
  const filtered = filterPostings(postings, {
    cluster: clusterFilter,
    period: periodFilter,
    state: stateFilter,
    query,
  })
  const periodCounts = {
    all: filterPostings(postings, { cluster: clusterFilter, state: stateFilter, query }).length,
    recent: filterPostings(postings, { cluster: clusterFilter, period: 'recent', state: stateFilter, query }).length,
    prior: filterPostings(postings, { cluster: clusterFilter, period: 'prior', state: stateFilter, query }).length,
  }
  const stateCounts = {
    all: filterPostings(postings, { cluster: clusterFilter, period: periodFilter, query }).length,
    open: filterPostings(postings, { cluster: clusterFilter, period: periodFilter, state: 'open', query }).length,
    closed: filterPostings(postings, { cluster: clusterFilter, period: periodFilter, state: 'closed', query }).length,
  }

  let empty = null
  if (status === 'loading') empty = '공고 목록을 불러오는 중입니다…'
  else if (status === 'error') empty = '공고 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  else if (status === 'empty' || postings.length === 0) empty = NO_POSTINGS
  else if (filtered.length === 0) empty = '조건에 맞는 공고가 없습니다.'

  const filterChip = (value, selected, onClick, label) => (
    <button
      key={value}
      type="button"
      className={`posting-filter-chip${selected === value ? ' posting-filter-chip--on' : ''}`}
      aria-pressed={selected === value}
      onClick={() => onClick(value)}
    >
      {label}
    </button>
  )

  return (
    <ScopeTier label="공고">
      <div className="scope-switch__postings">
        <input
          className="posting-search"
          type="text"
          aria-label="회사·공고명·기업군 검색"
          placeholder="회사·공고명·기업군 검색"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="posting-filters">
          <div className="posting-filter" role="group" aria-label="분석 기간">
            <span className="posting-filter__label">분석 기간</span>
            <div className="posting-filter__chips">
              {filterChip('all', periodFilter, setPeriodFilter, `전체 ${periodCounts.all}`)}
              {filterChip('recent', periodFilter, setPeriodFilter, `2026년 ${periodCounts.recent}`)}
              {filterChip('prior', periodFilter, setPeriodFilter, `2024~2025년 ${periodCounts.prior}`)}
            </div>
          </div>
          <div className="posting-filter" role="group" aria-label="채용 상태">
            <span className="posting-filter__label">채용 상태</span>
            <div className="posting-filter__chips">
              {filterChip('all', stateFilter, setStateFilter, `전체 ${stateCounts.all}`)}
              {filterChip('open', stateFilter, setStateFilter, `진행 중 ${stateCounts.open}`)}
              {filterChip('closed', stateFilter, setStateFilter, `마감 ${stateCounts.closed}`)}
            </div>
          </div>
        </div>
        <p className="posting-count" role="status" aria-live="polite">
          {`조건에 맞는 공고 ${filtered.length}건 · 전체 ${postings.length}건`}
        </p>
        <div className="posting-list posting-list--scope">
          {empty && (
            <div className={`posting-empty${status === 'error' ? ' posting-empty--error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>
              <p>{empty}</p>
              {status === 'error' && <button type="button" className="posting-retry" onClick={onRetry}>다시 시도</button>}
            </div>
          )}
          {!empty && filtered.map((p) => (
            <button
              key={p.posting_id}
              type="button"
              className={`posting-row posting-row--scope${p.posting_id === postingId ? ' posting-row--on' : ''}`}
              aria-pressed={p.posting_id === postingId}
              onClick={() => onPick(p)}
            >
              <span className="co">{p.company}</span>
              <span className="ti">{p.title}</span>
              <span className="posting-cluster">{p.cluster_tag}</span>
              <span className="posting-row__badges">
                <span className="posting-year">{postingYear(p) ? `${postingYear(p)}년` : '연도 미상'}</span>
                <span className={`posting-status posting-status--${postingState(p)}`}>
                  {postingState(p) === 'closed' ? '마감' : '진행 중'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </ScopeTier>
  )
}

function ScopeSwitch({ scope, jobLabel, postings = [], postingsStatus = 'loading', onRetryPostings, myPosting, payloadScope, hint, onSelect }) {
  const kind = kindOf(scope)
  // 3단 목록을 좁히는 기업군. 범위가 아니라 목록 보기 상태라 여기 둔다.
  // 처음에는 좁히지 않는다 — 직무의 공고 전체가 바로 보여야 한다.
  const [clusterFilter, setClusterFilter] = useState(null)
  // 직무 전체·내가 입력한 공고 범위에서도 기업군은 기억해 둔다. 되돌아왔을 때 처음 기업군으로
  // 튀지 않게 하려는 것이다. 요청에는 data/clusters.js 의 apiScope 가 걸러 내보낸다.
  const cluster = scope.cluster_tag || DEFAULT_CLUSTER
  const postingId = kind === 'posting' ? scope.posting_id : null
  const selected = postings.find((p) => p.posting_id === postingId)
  const postingLabel = selected ? `${selected.company} ${selected.title}` : null
  // 고른 공고의 기업군을 앞세운다. 목록에서 바로 고르면 기업군은 공고가 데려온다.
  const postingCluster = selected ? selected.cluster_tag : cluster
  // 목록을 못 받았거나 비었으면 개별 공고 범위 자체를 열지 않는다.
  const noPostings = postingsStatus === 'empty' || postingsStatus === 'error'

  // 개별 공고를 요청했는데 서버가 넓은 범위 결과를 내려 준 경우(CONTRACT 4장의 범위 폴백).
  // 조용히 다른 범위 결과를 보여 주지 않는다.
  // 아직 공고를 고르지 않은 상태는 폴백이 아니라 기업군 결과를 부른 것이므로 뺀다.
  const fellBackTo = kind === 'posting' && postingId && payloadScope && payloadScope.level && payloadScope.level !== 'posting'
    ? payloadScope.level
    : null

  const select = (next) => {
    if (!sameScope(next, scope)) onSelect(next)
  }
  const pickKind = (next) => {
    if (next === 'overall') select({ level: 'overall', cluster_tag: cluster, posting_id: null })
    else if (next === 'mine') select({ level: 'mine', cluster_tag: cluster, posting_id: null })
    else if (next === 'posting') select({ level: 'posting', cluster_tag: cluster, posting_id: postingId })
    else select({ level: 'cluster', cluster_tag: cluster, posting_id: null })
  }
  // 기업군 칩. 개별 공고 범위에서는 3단 목록을 좁히는 거르개로도 쓴다.
  // `전체` 는 좁히기만 풀고 범위는 건드리지 않는다 — 고른 공고를 잃지 않기 위해서다.
  const pickCluster = (next) => {
    if (next === ALL_CLUSTERS) {
      setClusterFilter(null)
      return
    }
    setClusterFilter(next)
    // 기업군을 바꾸면 이전 기업군의 공고 선택은 의미가 없으므로 비운다. 1단은 그대로 둔다.
    select({ level: kind === 'posting' ? 'posting' : 'cluster', cluster_tag: next, posting_id: null })
  }
  // 공고를 고르면 그 공고의 기업군까지 함께 올린다. 기업군을 먼저 고를 필요가 없다.
  // 고른 공고를 다시 누르면 선택만 푼다. 1단은 개별 공고에 머문다.
  const pickPosting = (p) => {
    const off = p.posting_id === postingId
    select({
      level: 'posting',
      cluster_tag: off ? cluster : (p.cluster_tag || cluster),
      posting_id: off ? null : p.posting_id,
    })
  }

  let current
  if (kind === 'mine' && myPosting) {
    const title = myPosting.title ? `${myPosting.title} · ` : ''
    current = `내가 입력한 공고 기준 · ${title}${myPosting.submittedAt} 입력`
  } else if (kind === 'posting' && postingLabel) {
    current = `${postingCluster} 기업군 · ${postingLabel} 공고 기준`
  } else if (kind === 'posting') {
    current = `${cluster} 기업군 기준 — 아직 공고를 고르지 않았습니다`
  } else if (kind === 'overall') {
    current = `${jobLabel} 전체 기준`
  } else {
    current = `${cluster} 기업군 기준`
  }

  return (
    <div className="scope-switch" role="group" aria-label="분석 범위 선택">
      <KindChips kind={kind} hasMine={!!myPosting} postingDisabled={noPostings} onPick={pickKind} />
      {(kind === 'cluster' || kind === 'posting') && (
        <ClusterChips
          cluster={kind === 'posting' ? (clusterFilter || ALL_CLUSTERS) : cluster}
          withAll={kind === 'posting'}
          onPick={pickCluster}
        />
      )}
      {kind === 'posting' && (
        <PostingPicker
          postings={postings}
          postingId={postingId}
          clusterFilter={clusterFilter}
          status={postingsStatus}
          onPick={pickPosting}
          onRetry={onRetryPostings}
        />
      )}

      <p className="scope-switch__line">
        <span className="scope-switch__now">지금 보고 있는 범위</span>
        <span>{current}</span>
      </p>
      {postingsStatus === 'empty' && <p className="scope-switch__hint">{NO_POSTINGS}</p>}
      {postingsStatus === 'error' && <p className="scope-switch__hint">공고 목록 연결을 확인해 주세요.</p>}
      {kind === 'posting' && !postingId && !noPostings && (
        <p className="scope-switch__hint">공고 목록에서 하나를 고르면 그 공고 기준으로 바뀝니다.</p>
      )}
      {hint && <p className="scope-switch__hint">{hint}</p>}
      {fellBackTo && (
        <p className="scope-switch__notice" role="status">
          이 공고의 개별 결과가 아직 없어 {SCOPE_LEVEL_LABEL[fellBackTo] || fellBackTo} 기준으로 보여 줍니다
        </p>
      )}
    </div>
  )
}

export default ScopeSwitch
