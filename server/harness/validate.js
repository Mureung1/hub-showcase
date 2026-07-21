// ─────────────────────────────────────────────────────────────
//  검증기(validator) — LLM이 낸 갭 분석이 '정직성 규칙'을 지켰는지 검사.
//  스키마(구조: 칸·타입·enum)는 이미 통과했다고 가정. 여기서는 '의미' 규칙만 본다.
//  SCPC decide_control 사다리(먼저 걸리면 끝)와 달리, 검증기는 '감사'라서
//  위반을 전부 모은다 → 재생성 때 한 번에 다 고치라고 되돌려주기 위해.
//
//  검사 단위(요구역량 하나 = req):
//   { name, status: 'strong'|'ok'|'weak'|'gap',
//     tags: [{label, type: 'repo'|'wiki'|'self'|'gap'}],
//     why, action, aiBar?: {self, assist, note} }
// ─────────────────────────────────────────────────────────────

// ── 규칙 1: 근거 없는 충족 ───────────────────────────────────
//  status가 strong/ok(충족)인데 repo/wiki 근거 태그가 하나도 없으면 위반.
//  제품 제1원칙 "근거 없으면 충족 안 씀"을 코드로 강제.
export function checkGrounding(req) {
  const claimsMet = req.status === 'strong' || req.status === 'ok'
  const hasEvidence = (req.tags || []).some((t) => t.type === 'repo' || t.type === 'wiki')
  if (claimsMet && !hasEvidence) {
    return `근거 없는 충족: "${req.name}"가 ${req.status}인데 repo/wiki 근거 태그가 없음`
  }
  return null
}

// ── 규칙 2: aiBar 오용 ───────────────────────────────────────
//  aiBar(AI작성 vs 직접 실측)는 '코드 근거(repo 태그)'가 있는 항목에만 의미가 있다.
//  코드가 없는 항목(gap 등)에 aiBar를 붙이면 신호를 희석시키는 오용 → 위반.
//  (haiku가 미보유 항목에 self:0/assist:0 aiBar를 억지로 채운 실패를 잡는다)
export function checkAiBarMisuse(req) {
  if (!req.aiBar) return null
  const hasRepo = (req.tags || []).some((t) => t.type === 'repo')
  if (!hasRepo) {
    return `aiBar 오용: "${req.name}"에 코드 근거(repo 태그)가 없는데 aiBar가 붙음`
  }
  return null
}

// ── 규칙 3: AI가 짠 코드는 충족 근거로 약하다 (내부 일관성) ────
//  aiBar가 스스로 'AI 작성 비중 높음(assist>50)'이라 말하면서
//  그 항목을 strong/ok(충족)로 매기면 자기모순 → weak로 내려야 함.
//  (haiku가 assist 60%면서 Java/Spring을 ok로 준 실패를 잡는다)
export function checkAiCodeGrade(req) {
  if (!req.aiBar) return null
  const aiHeavy = req.aiBar.assist > 50
  const claimsMet = req.status === 'strong' || req.status === 'ok'
  if (aiHeavy && claimsMet) {
    return `AI 코드로 충족 주장: "${req.name}"는 AI작성 ${req.aiBar.assist}%인데 ${req.status} — 구현 근거로 약하므로 weak로`
  }
  return null
}

// ── 규칙 4: 구현이 개념보다 높음 (지원자 전제 위반) ───────────
//  이 지원자는 '개념 ≫ 구현'이 전제. impl이 concept보다 높으면 의심 → 위반.
//  (공고 전체(job) 레벨 규칙)
export function checkConceptImplGap(job) {
  if (typeof job.impl === 'number' && typeof job.concept === 'number' && job.impl > job.concept) {
    return `전제 위반: 구현(${job.impl}) > 개념(${job.concept}) — 이 지원자는 개념≫구현이 전제`
  }
  return null
}

// ── 검증기 본체: 규칙들을 전부 돌려서 위반을 모은다 ──────────
const REQ_RULES = [checkGrounding, checkAiBarMisuse, checkAiCodeGrade]

export function validate(job) {
  const violations = []

  // 요구역량(필수 + 우대) 전체에 req 규칙 적용
  const reqs = [...(job.reqRequired || []), ...(job.reqPreferred || [])]
  for (const req of reqs) {
    for (const rule of REQ_RULES) {
      const v = rule(req)
      if (v) violations.push(v)
    }
  }

  // 공고 전체(job) 레벨 규칙
  const jobV = checkConceptImplGap(job)
  if (jobV) violations.push(jobV)

  return violations
}
