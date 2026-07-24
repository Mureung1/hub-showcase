// 통계 집계 모듈 (rule) — 1차 슬라이스: 블록 1(KPI)·7(기술 빈도)·10(요구 항목 전체표)
// 입력: 정형 공고 배열 / 출력: GET /api/stats 화면 계약
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

function aggregate(postings) {
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

  // --- scope_expansion (블록 2) — 직무 외 영역별 요구 비율 ---
  // 영역 목록은 잠정 enum. 추출 에이전트(3차)가 데이터를 보고 재구성한다.
  const OUT_TAGS = {
    infra_deploy: { label: '인프라·배포', desc: 'Docker, AWS, CI/CD 운영' },
    test: { label: '테스트', desc: '단위·통합 테스트 작성' },
    data: { label: '데이터', desc: '배치, 파이프라인, 로그 분석' },
    docs: { label: '문서화', desc: 'API 명세, 기술 문서, 위키' },
    front: { label: '프론트', desc: '간단한 어드민·화면 수정' },
  }
  const scope_expansion = Object.entries(OUT_TAGS)
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

  // --- labels (블록 8의 라벨 두 열 — 현실 열은 3차 LLM 몫) ---
  const dist = (field) => {
    const m = {}
    for (const p of recent) m[p[field]] = (m[p[field]] || 0) + 1
    return Object.entries(m)
      .map(([label, n]) => ({ label, pct: pct(n, recent.length) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }
  const labels = { edu: dist('edu_label'), career: dist('career_label') }

  // ===== 3a 슬라이스: 추출 완료 필드의 rule 집계 =====
  // 통계 설명 문구(interpretation)는 샘플 큐레이션 — 에이전트 구현 시 LLM 출력으로 대체한다.

  // --- advanced (블록 4) — 시니어급 문장 유형별 비율 + 원문 인용 ---
  const ADV_TYPES = { traffic: '대용량 트래픽', concurrency: '동시성·정합성', incident: '장애 대응·모니터링' }
  const advanced = Object.entries(ADV_TYPES)
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
  const COMBOS = [
    { id: 'base', name: 'Java + Spring Boot + JPA + MySQL', slugs: ['java', 'spring-boot', 'jpa', 'mysql'],
      desc: '한 도메인의 CRUD REST API를 DB와 연결하고 트랜잭션·연관관계까지 다루는 기본 조합입니다.',
      level: '한 도메인을 배포 가능한 API로 완성' },
    { id: 'redis', name: '기본 스택 + Redis', slugs: ['java', 'spring-boot', 'redis'],
      desc: '조회 성능·세션 관리를 캐시로 개선해 본 경험을 묻는 조합입니다.',
      level: '캐시로 조회 개선 + 이유 설명' },
    { id: 'deploy', name: 'Docker + AWS + CI/CD', slugs: ['docker', 'aws', 'cicd'],
      desc: '빌드부터 배포까지 파이프라인을 직접 구성해 본 경험을 묻는 조합입니다.',
      level: '배포 파이프라인 1회 이상 구성' },
    { id: 'kafka', name: 'Kafka 이벤트 처리', slugs: ['kafka'],
      desc: '이벤트 기반 아키텍처의 개념 이해를 묻는 우대 조합입니다.',
      level: '개념 이해 + 토이 수준 경험(우대)' },
  ]
  const combos = COMBOS.map((c) => {
    const count = recent.filter((p) => c.slugs.every((slug) => p.skills.some((s) => s.slug === slug))).length
    return { id: c.id, name: c.name, desc: c.desc, level: c.level, count,
      pct: pct(count, recent.length), interpretation_source: 'sample' }
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

  // --- reality (블록 8 현실 열) — 본문이 실제로 요구하는 것 ---
  const REALITY_LABEL = {
    project_experience: '완성된 프로젝트 경험',
    deploy_ops: '배포·운영까지 해 본 경험',
    intern_award: '인턴·수상·오픈소스 우대',
  }
  const reality = Object.entries(REALITY_LABEL)
    .map(([tag, label]) => {
      const count = recent.filter((p) => p.reality_tags.includes(tag)).length
      return { tag, label, pct: pct(count, recent.length) }
    })
    .filter((r) => r.pct > 0)
    .sort((a, b) => b.pct - a.pct)

  // --- cluster_axes (블록 9) — 기업군 × 강조축 히트맵 ---
  const AXIS_LABEL = {
    performance: '성능·트래픽', tx_security: '트랜잭션·보안', api_domain: 'API·도메인',
    ownership: '오너십·실행', process_docs: '프로세스·문서',
  }
  const level = (v) => (v === null || v < 15 ? '—' : v >= 60 ? '강' : v >= 35 ? '중' : '약')
  const cluster_axes = {
    axes: Object.values(AXIS_LABEL),
    rows: Object.keys(clusterN).map((cluster) => ({
      cluster,
      n: clusterN[cluster],
      cells: Object.keys(AXIS_LABEL).map((axis) => {
        const count = recent.filter((p) => p.cluster_tag === cluster && p.axis_mentions.includes(axis)).length
        const v = pct(count, clusterN[cluster])
        return { axis: AXIS_LABEL[axis], pct: v, level: level(v) }
      }),
    })),
  }

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
    scope_expansion,
    inflation,
    trend3,
    labels,
    advanced,
    combos,
    reality,
    cluster_axes,
    tech_freq,
    items,
    error: null,
  }
}

module.exports = { aggregate }
