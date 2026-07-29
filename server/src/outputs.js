// 산출물 조합기와 범위 폴백 규칙 (CONTRACT 4장).
//
// Express 는 payload 를 만들지 않는다. 저장된 payload 를 **그대로** 돌려주는 것이 원칙이다.
// 다만 posting 범위의 `strategy`·`roadmap` 은 저장하지 않으므로(CONTRACT 4장) 요청한 범위에
// 행이 없을 때만 넓은 범위로 한 칸씩 떨어뜨린다.
//
//   posting → 그 공고의 기업군 → overall
//
// 떨어뜨렸으면 화면이 무엇을 보고 있는지 알아야 하므로 payload 의 `scope` 를
// 실제로 쓴 범위로 바꾼다. 그 외의 키는 손대지 않는다.

const SCOPE_LEVELS = ['overall', 'cluster', 'posting']

// 요청 범위에서 시작해 넓은 쪽으로 가는 후보 목록.
// `scope` 는 {level, clusterTag, clusterId, postingId, jobRoleId} 형태의 내부 표현이다.
function fallbackChain(scope) {
  const candidates = []
  if (scope.level === 'posting') {
    candidates.push({ level: 'posting', scopeId: scope.postingId })
  }
  if (scope.level === 'posting' || scope.level === 'cluster') {
    candidates.push({ level: 'cluster', scopeId: scope.clusterId })
  }
  candidates.push({ level: 'overall', scopeId: scope.jobRoleId })
  return candidates.filter((candidate) => Boolean(candidate.scopeId))
}

// 실제로 쓴 범위를 payload 의 `scope` 형태(CONTRACT 5.B)로 적는다.
// `cluster_tag` 는 화면이 보낸 기업군 표시명을 그대로 되돌려준다.
function scopeDescriptor(level, scope) {
  if (level === 'overall') {
    return { level: 'overall', cluster_tag: null, posting_id: null }
  }
  if (level === 'cluster') {
    return { level: 'cluster', cluster_tag: scope.clusterTag || null, posting_id: null }
  }
  return { level: 'posting', cluster_tag: scope.clusterTag || null, posting_id: scope.postingId || null }
}

// 활성 분석 버전에서 산출물 하나를 찾는다.
// 반환: {payload, level, fell_back} 또는 후보가 모두 비면 null.
async function resolveOutput(getOutput, analysisVersion, outputType, scope) {
  if (!SCOPE_LEVELS.includes(scope.level)) {
    throw new Error(`알 수 없는 범위 수준: ${scope.level}`)
  }
  const chain = fallbackChain(scope)
  for (const candidate of chain) {
    const payload = await getOutput(analysisVersion, candidate.level, candidate.scopeId, outputType)
    if (!payload) continue
    const fellBack = candidate.level !== scope.level
    return {
      payload: fellBack
        ? { ...payload, scope: scopeDescriptor(candidate.level, scope) }
        : payload,
      level: candidate.level,
      fell_back: fellBack,
    }
  }
  return null
}

// 화면 응답 한 벌을 만든다. 저장된 결과가 없으면 조용히 빈 값을 내지 않고 오류를 던진다.
async function loadPayload(getOutput, analysisVersion, outputType, scope) {
  const resolved = await resolveOutput(getOutput, analysisVersion, outputType, scope)
  if (!resolved) {
    const error = new Error(`활성 분석 버전에 ${outputType} 산출물이 없습니다`)
    error.code = 'NO_ACTIVE_ANALYSIS'
    throw error
  }
  return resolved
}

module.exports = { fallbackChain, scopeDescriptor, resolveOutput, loadPayload, SCOPE_LEVELS }
