// 통계 집계 모듈 (rule) — 1차 슬라이스: 블록 1(KPI)·7(기술 빈도)·10(요구 항목 전체표)
// 입력: 정형 공고 배열(스키마: docs 계약 4.1) / 출력: GET /api/stats 응답(계약 4.2)
//
// 계약 정의(검증에서 확정한 규칙):
// - 모든 % 의 분모는 recent 스냅샷 공고 수 (freq_by_cluster만 해당 기업군 공고 수)
// - avg_required_skills = 공고당 skills[] 개수 평균(필수+우대 포함)
// - entry_label_gap_pct 분모 = '신입가능' 라벨 공고
// - 우대→필수 이동 판정 = prev 필수율 <40% 이고 (recent−prev) ≥ +20%p, 양쪽 표본 n≥3
// - trend.direction = |delta| ≥ 8%p 일 때만 increase/decrease, prev 표본 없으면 'unknown'
// - evidence.text 는 1차(rule)에서는 null — 3차(LLM 추출)에서 원문 문장이 채워짐

function pct(n, d) {
  return d === 0 ? null : Math.round((n / d) * 100)
}

// 스냅샷 하나에서 스킬별로 [등장 수 / 필수 수 / 기업군별 수 / 등장 공고 id]를 센다
function skillStats(list) {
  const map = new Map()
  for (const p of list) {
    for (const s of p.skills) {
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

function aggregate(postings) {
  const recent = postings.filter((p) => p.snapshot === 'recent')
  const prev = postings.filter((p) => p.snapshot === 'prev')
  const R = skillStats(recent)
  const P = skillStats(prev)

  const clusterN = {}
  for (const p of recent) clusterN[p.cluster_tag] = (clusterN[p.cluster_tag] || 0) + 1

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

  // --- items (블록 10 화면 + 역산 에이전트 입력을 같은 배열로) ---
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
        aliases: [], // 3차: NCS·직무사전 기반 정규화
        category: null, // 3차: 에이전트 분류
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
        impl_level: null, // 3차: LLM 추론
        evidence: e.postings.slice(0, 3).map((id) => ({ text: null, posting_id: id, source_url: null })),
        support: { n_overall: e.count, n_by_cluster: e.byCluster },
        confidence: e.count >= 10 ? 'high' : e.count >= 5 ? 'medium' : 'low',
      }
    })
    .sort((a, b) => b.freq_overall - a.freq_overall)

  return {
    job: 'backend',
    meta: {
      generated_at: new Date().toISOString(),
      snapshots: {
        recent: { label: '최근 1년', n: recent.length },
        prev: { label: '이전 1년', n: prev.length },
      },
      sources: [...new Set(postings.map((p) => p.source.type))],
      disclaimer: '샘플 데이터 기반 결과입니다',
    },
    kpi,
    tech_freq,
    items,
    error: null,
  }
}

module.exports = { aggregate }
