// 폴백 전용 통계 집계 모듈 (rule).
//
// Phase 22 이후 화면 통계는 활성 분석 버전의 `statistics` payload 를 그대로 읽는다.
// 이 모듈은 평면 표 `legacy_posting_samples` 만 있는 상황을 위한 폴백 경로에서만 쓴다.
//
// 라벨 표는 **인자로 받는다.** 태그·유형·조합·축 이름은 직무마다 다르므로(CONTRACT 5.A)
// 백엔드 전용 상수를 서버 코드에 두면 다른 직무에 그대로 새어 나간다. 그래서
// 이 함수는 backend 가 아닌 직무를 받으면 빈 배열과 0% 를 내지 않고 오류를 던진다.
//
// 계약 정의(검증에서 확정한 규칙):
// - 모든 % 의 분모는 recent 스냅샷 공고 수
//   (freq_by_cluster는 recent 기업군 공고 수, cluster_axes는 전체 기간 기업군 공고 수)
// - avg_required_skills = 공고당 skills[] 개수 평균(필수+우대 포함)
// - entry_label_gap_pct 분모 = '신입가능' 라벨 공고
// - 우대→필수 이동 판정 = prev 필수율 <40% 이고 (recent−prev) ≥ +20%p, 양쪽 표본 n≥3
// - trend.direction = |delta| ≥ 8%p 일 때만 increase/decrease, prev 표본 없으면 'unknown'
// - evidence.text 는 rule 집계에서는 null

// 평면 표 폴백이 다룰 수 있는 유일한 직무. 나머지 직무의 어휘는 이 규칙으로 셀 수 없다.
const FALLBACK_JOB = 'backend'

const REQUIRED_LABEL_KEYS = ['out_tags', 'advanced_types', 'combos', 'reality_labels', 'axis_labels']

function pct(n, d) {
  return d === 0 ? null : Math.round((n / d) * 100)
}

function heatmapLevel(value) {
  if (value === null) return '—'
  if (value <= 20) return '약'
  if (value < 100) return '중'
  return '강'
}

// 스냅샷 하나에서 스킬별로 [등장 수 / 필수 수 / 기업군별 수 / 등장 공고 id]를 센다
function skillStats(list) {
  const map = new Map()
  for (const p of list) {
    const seenSlugs = new Set()
    for (const s of p.skills) {
      if (seenSlugs.has(s.slug)) continue
      seenSlugs.add(s.slug)

      if (!map.has(s.slug)) {
        map.set(s.slug, { name: s.name, slug: s.slug, count: 0, required: 0, byCluster: {}, postings: [] })
      }
      const e = map.get(s.slug)
      e.count += 1
      if (s.requirement === 'required') e.required += 1
      e.byCluster[p.cluster_tag] = (e.byCluster[p.cluster_tag] || 0) + 1
      e.postings.push(p.posting_id)
    }
  }
  return map
}

// 라벨 표가 없거나 직무가 다르면 여기서 끝낸다. 조용한 빈 결과는 화면에서
// "요구가 없다" 로 읽히므로 낼 수 없다.
function assertFallbackInput(job, labels) {
  if (job !== FALLBACK_JOB) {
    const error = new Error(
      `평면 표 폴백 집계는 ${FALLBACK_JOB} 직무만 지원합니다. ${job || '(직무 없음)'} 은 활성 분석 버전의 statistics payload 를 써야 합니다`
    )
    error.code = 'UNSUPPORTED_FALLBACK_JOB'
    throw error
  }
  if (!labels || typeof labels !== 'object') {
    const error = new Error('라벨 표(labels)가 필요합니다. 태그·유형·조합·축 이름은 직무마다 다릅니다')
    error.code = 'MISSING_LABELS'
    throw error
  }
  const missing = REQUIRED_LABEL_KEYS.filter((key) => !labels[key])
  if (missing.length > 0) {
    const error = new Error(`라벨 표에 ${missing.join(', ')} 가 없습니다`)
    error.code = 'MISSING_LABELS'
    throw error
  }
}

/**
 * @param {Array} postings 평면 공고 배열 (`legacy_posting_samples`)
 * @param {{job: string, labels: object}} options 직무와 라벨 표
 */
function aggregate(postings, options = {}) {
  const { job, labels } = options
  assertFallbackInput(job, labels)

  const recent = postings.filter((p) => p.snapshot === 'recent')
  const prev = postings.filter((p) => p.snapshot === 'prev')
  if (recent.length === 0) {
    const error = new Error('최근 스냅샷에 집계할 채용공고가 없습니다')
    error.code = 'EMPTY_DATASET'
    throw error
  }
  const R = skillStats(recent)
  const P = skillStats(prev)

  const clusterN = {}
  for (const p of recent) clusterN[p.cluster_tag] = (clusterN[p.cluster_tag] || 0) + 1

  // 기업군 히트맵은 표본을 확보하기 위해 최근·이전 기간을 합산한다.
  // 다른 통계의 기간 비교와 기업군 빈도는 위 recent 기반 clusterN을 유지한다.
  const clusterAxesN = {}
  for (const p of postings) clusterAxesN[p.cluster_tag] = (clusterAxesN[p.cluster_tag] || 0) + 1

  // --- 우대→필수 이동 항목 (KPI ④, 블록 3의 씨앗) ---
  const promoted = [...R.keys()].filter((slug) => {
    const r = R.get(slug)
    const pv = P.get(slug)
    if (!pv || pv.count < 3 || r.count < 3) return false
    const prevRatio = pct(pv.required, pv.count)
    const recentRatio = pct(r.required, r.count)
    return prevRatio < 40 && recentRatio - prevRatio >= 20
  })

  // --- KPI (블록 1) ---
  const entryPostings = recent.filter((p) => p.entry_label === '신입가능')
  const kpi = {
    avg_required_skills: {
      value: +(recent.reduce((a, p) => a + p.skills.length, 0) / recent.length).toFixed(1),
      unit: '개',
    },
    out_of_role_pct: {
      value: pct(recent.filter((p) => p.out_of_role_tags.length > 0).length, recent.length),
      unit: '%',
    },
    entry_label_gap_pct: {
      value: pct(entryPostings.filter((p) => p.advanced_spans.length > 0).length, entryPostings.length),
      unit: '%',
      highlight: true,
    },
    promoted_to_required_cnt: { value: promoted.length, unit: '개' },
    advanced_mention_pct: {
      value: pct(recent.filter((p) => p.advanced_spans.length > 0).length, recent.length),
      unit: '%',
    },
  }

  // --- tech_freq (블록 7) — recent 기준 내림차순 ---
  const tech_freq = [...R.values()]
    .map((e) => ({
      name: e.name,
      slug: e.slug,
      count: e.count,
      pct: pct(e.count, recent.length),
      required_ratio: pct(e.required, e.count),
    }))
    .sort((a, b) => b.count - a.count)

  // --- items (블록 10 화면 + 채용공고 해석 에이전트 입력을 같은 배열로) ---
  const items = [...R.values()]
    .map((e) => {
      const pv = P.get(e.slug)
      const prevPct = pv ? pct(pv.count, prev.length) : null
      const recentPct = pct(e.count, recent.length)
      let direction = 'unknown'
      if (prevPct !== null) {
        const delta = recentPct - prevPct
        direction = delta >= 8 ? 'increase' : delta <= -8 ? 'decrease' : 'stable'
      }
      return {
        item_id: e.slug,
        name: e.name,
        aliases: [],
        category: null,
        scope: 'in_role',
        is_advanced: false,
        freq_overall: recentPct,
        required_ratio: pct(e.required, e.count),
        freq_by_cluster: Object.fromEntries(
          Object.entries(e.byCluster).map(([c, n]) => [c, pct(n, clusterN[c])])
        ),
        trend: {
          prev_pct: prevPct,
          recent_pct: recentPct,
          direction,
          requirement_shift: promoted.includes(e.slug) ? 'preferred_to_required' : null,
        },
        impl_level: null,
        evidence: e.postings.slice(0, 3).map((id) => ({ text: null, posting_id: id, source_url: null })),
        support: { n_overall: e.count, n_by_cluster: e.byCluster },
        confidence: e.count >= 10 ? 'high' : e.count >= 5 ? 'medium' : 'low',
      }
    })
    .sort((a, b) => b.freq_overall - a.freq_overall)

  // --- scope_expansion (블록 2) — 직무 외 영역별 요구 비율 ---
  const scope_expansion = Object.entries(labels.out_tags)
    .map(([tag, m]) => {
      const count = recent.filter((p) => p.out_of_role_tags.includes(tag)).length
      return { tag, label: m.label, desc: m.desc, count, pct: pct(count, recent.length) }
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)

  // --- inflation (블록 3) — 필수율 델타 상위 자동 선별(큐레이션 아님) ---
  const inflationItems = [...R.keys()]
    .map((slug) => {
      const r = R.get(slug)
      const pv = P.get(slug)
      if (!pv || r.count < 3 || pv.count < 3) return null
      const prevRatio = pct(pv.required, pv.count)
      const recentRatio = pct(r.required, r.count)
      return { item_id: slug, name: r.name, prev_ratio: prevRatio, recent_ratio: recentRatio, delta: recentRatio - prevRatio }
    })
    .filter((x) => x && x.delta >= 15)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5)
  // 이동 항목이 없으면 stable=true — 화면은 "요구가 안정적" 메시지로 대체
  const inflation = { items: inflationItems, stable: inflationItems.length === 0 }

  // --- trend3 (블록 5) — 증가/유지/감소, 변화폭 유의미한 항목만(개수 동적) ---
  const trendEntries = [...R.values()]
    .filter((e) => e.count >= 3)
    .map((e) => {
      const pv = P.get(e.slug)
      const recentPct = pct(e.count, recent.length)
      const prevPct = pv ? pct(pv.count, prev.length) : null
      return {
        item_id: e.slug, name: e.name,
        prev_pct: prevPct, recent_pct: recentPct,
        delta: prevPct === null ? null : recentPct - prevPct,
      }
    })
  const trend3 = {
    increase: trendEntries.filter((t) => t.delta !== null && t.delta >= 8).sort((a, b) => b.delta - a.delta).slice(0, 3),
    stable: trendEntries.filter((t) => t.delta !== null && Math.abs(t.delta) < 8).sort((a, b) => b.recent_pct - a.recent_pct).slice(0, 3),
    decrease: trendEntries.filter((t) => t.delta !== null && t.delta <= -8).sort((a, b) => a.delta - b.delta).slice(0, 3),
  }

  // --- labels (블록 8의 라벨 두 열) ---
  const dist = (field) => {
    const m = {}
    for (const p of recent) m[p[field]] = (m[p[field]] || 0) + 1
    return Object.entries(m)
      .map(([label, n]) => ({ label, pct: pct(n, recent.length) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }
  const labelBlocks = { edu: dist('edu_label'), career: dist('career_label') }

  // --- advanced (블록 4) — 시니어급 문장 유형별 비율 + 원문 인용 ---
  const advanced = Object.entries(labels.advanced_types)
    .map(([type, label]) => {
      const hits = recent.filter((p) => p.advanced_spans.some((s) => s.type === type))
      const first = hits.flatMap((p) => p.advanced_spans.filter((s) => s.type === type))[0]
      return {
        type, label,
        count: hits.length,
        pct: pct(hits.length, recent.length),
        quote: first ? first.text : null,
        more_count: Math.max(0, hits.length - 1),
      }
    })
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count)

  // --- combos (블록 6) — 후보 조합의 동시 출현 rule 집계 ---
  const combos = labels.combos
    .map((c) => {
      const count = recent.filter((p) => c.slugs.every((slug) => p.skills.some((s) => s.slug === slug))).length
      return {
        id: c.id, name: c.name, desc: c.desc, level: c.level, count,
        pct: pct(count, recent.length), interpretation_source: 'sample',
      }
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

  // --- reality (블록 8 현실 열) — 본문이 실제로 요구하는 것 ---
  const reality = Object.entries(labels.reality_labels)
    .map(([tag, label]) => {
      const count = recent.filter((p) => p.reality_tags.includes(tag)).length
      return { tag, label, pct: pct(count, recent.length) }
    })
    .filter((r) => r.pct > 0)
    .sort((a, b) => b.pct - a.pct)

  // --- cluster_axes (블록 9) — 기업군 × 강조축 히트맵 ---
  const cluster_axes = {
    axes: Object.values(labels.axis_labels),
    rows: Object.keys(clusterAxesN).map((cluster) => ({
      cluster,
      n: clusterAxesN[cluster],
      cells: Object.keys(labels.axis_labels).map((axis) => {
        const count = postings.filter((p) => p.cluster_tag === cluster && p.axis_mentions.includes(axis)).length
        const v = pct(count, clusterAxesN[cluster])
        return { axis: labels.axis_labels[axis], pct: v, level: heatmapLevel(v) }
      }),
    })),
  }

  return {
    job,
    meta: {
      generated_at: new Date().toISOString(),
      snapshots: {
        recent: { label: '최근 1년', n: recent.length },
        prev: { label: '이전 1년', n: prev.length },
      },
      sources: [...new Set(postings.map((p) => p.source.type))],
      disclaimer: '샘플 데이터 기반 결과입니다',
      is_synthetic: false,
      fallback: 'legacy_posting_samples',
    },
    kpi,
    scope_expansion,
    inflation,
    trend3,
    labels: labelBlocks,
    advanced,
    combos,
    reality,
    cluster_axes,
    tech_freq,
    items,
    error: null,
  }
}

module.exports = { aggregate, heatmapLevel, FALLBACK_JOB }
