import { useState } from 'react'
import { CLUSTERS, DEFAULT_CLUSTER } from '../data/clusters'

// 해석·합격 전략·준비 로드맵 세 화면의 범위 선택을 혼자 맡는 블록.
//
// 예전에는 범위를 고르는 자리가 두 벌이었다. 이 줄의 칩과, 각 화면 본문의 기업군 칩·공고
// 목록이 같은 scope 를 서로 다른 생김새로 건드렸다. 무엇을 눌러 무엇이 바뀌는지 읽히지
// 않아, 기업군과 개별 공고를 번갈아 눌러도 같은 안내만 본다는 혼란이 나왔다.
// 그래서 선택은 전부 여기로 모으고 본문에서는 지웠다. 세 화면은 이 블록 하나만 쓴다.
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
//   postings        지금 기업군의 공고 목록 — 화면이 받은 payload 의 postings_in_cluster
//   postingsLoading 그 목록을 아직 받는 중인지 (빈 목록의 이유를 구분해 쓴다)
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

// 1단 — 범위 종류.
function KindChips({ kind, hasMine, onPick }) {
  const kinds = hasMine ? ['overall', 'cluster', 'posting', 'mine'] : ['overall', 'cluster', 'posting']
  return (
    <ScopeTier label="범위">
      <div className="scope-switch__chips" role="group" aria-label="범위 종류">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`scope-chip${k === kind ? ' scope-chip--on' : ''}`}
            aria-pressed={k === kind}
            onClick={() => onPick(k)}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
    </ScopeTier>
  )
}

// 2단 — 기업군 여섯.
function ClusterChips({ cluster, onPick }) {
  return (
    <ScopeTier label="기업군">
      <div className="scope-switch__chips" role="group" aria-label="기업군">
        {CLUSTERS.map((c) => (
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

// 3단 — 그 기업군의 공고 목록. 검색어는 범위가 아니라 이 목록만의 상태라 여기 둔다.
// 목록이 짧으면 검색칸이 오히려 방해가 되므로 여덟 건을 넘을 때만 낸다.
function PostingPicker({ postings, postingId, loading, onPick }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const filtered = query
    ? postings.filter((p) => `${p.company} ${p.title}`.toLowerCase().includes(query))
    : postings

  return (
    <ScopeTier label="공고">
      <div className="scope-switch__postings">
        {postings.length > 8 && (
          <input
            className="posting-search"
            type="text"
            aria-label="회사·공고명 검색"
            placeholder="회사·공고명 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}
        <p className="posting-count">
          공고 {postings.length}건{query && ` · 검색 결과 ${filtered.length}건`}
        </p>
        <div className="posting-list posting-list--slim">
          {filtered.length === 0 && (
            <p className="posting-empty">
              {loading ? '공고 목록을 불러오는 중입니다…' : '조건에 맞는 공고가 없습니다.'}
            </p>
          )}
          {filtered.map((p) => (
            <button
              key={p.posting_id}
              type="button"
              className={`posting-row${p.posting_id === postingId ? ' posting-row--on' : ''}`}
              aria-pressed={p.posting_id === postingId}
              onClick={() => onPick(p.posting_id)}
            >
              <span className="co">{p.company}</span>
              <span className="ti">{p.title}</span>
              <span className="dt">{p.posted_at}</span>
            </button>
          ))}
        </div>
      </div>
    </ScopeTier>
  )
}

function ScopeSwitch({ scope, jobLabel, postings = [], postingsLoading = false, myPosting, payloadScope, hint, onSelect }) {
  const kind = kindOf(scope)
  // 직무 전체·내가 입력한 공고 범위에서도 기업군은 기억해 둔다. 되돌아왔을 때 처음 기업군으로
  // 튀지 않게 하려는 것이다. 요청에는 data/clusters.js 의 apiScope 가 걸러 내보낸다.
  const cluster = scope.cluster_tag || DEFAULT_CLUSTER
  const postingId = kind === 'posting' ? scope.posting_id : null
  const selected = postings.find((p) => p.posting_id === postingId)
  const postingLabel = selected ? `${selected.company} ${selected.title}` : null

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
  // 기업군을 바꾸면 이전 기업군의 공고 선택은 의미가 없으므로 비운다. 1단은 그대로 둔다.
  const pickCluster = (next) => select({ level: kind === 'posting' ? 'posting' : 'cluster', cluster_tag: next, posting_id: null })
  // 고른 공고를 다시 누르면 선택만 푼다. 1단은 개별 공고에 머문다.
  const pickPosting = (id) => select({ level: 'posting', cluster_tag: cluster, posting_id: id === postingId ? null : id })

  let current
  if (kind === 'mine' && myPosting) {
    const title = myPosting.title ? `${myPosting.title} · ` : ''
    current = `내가 입력한 공고 기준 · ${title}${myPosting.submittedAt} 입력`
  } else if (kind === 'posting' && postingLabel) {
    current = `${cluster} 기업군 · ${postingLabel} 공고 기준`
  } else if (kind === 'posting') {
    current = `${cluster} 기업군 기준 — 아직 공고를 고르지 않았습니다`
  } else if (kind === 'overall') {
    current = `${jobLabel} 전체 기준`
  } else {
    current = `${cluster} 기업군 기준`
  }

  return (
    <div className="scope-switch" role="group" aria-label="분석 범위 선택">
      <KindChips kind={kind} hasMine={!!myPosting} onPick={pickKind} />
      {(kind === 'cluster' || kind === 'posting') && (
        <ClusterChips cluster={cluster} onPick={pickCluster} />
      )}
      {kind === 'posting' && (
        <PostingPicker postings={postings} postingId={postingId} loading={postingsLoading} onPick={pickPosting} />
      )}

      <p className="scope-switch__line">
        <span className="scope-switch__now">지금 보고 있는 범위</span>
        <span>{current}</span>
      </p>
      {kind === 'posting' && !postingId && (
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
