import { describe, expect, test } from 'vitest'
import outputs from './outputs.js'

const { fallbackChain, resolveOutput, loadPayload } = outputs

// 저장소 대신 쓰는 가짜 조회. 키는 `(범위 수준, 범위 식별자, 산출물 종류)` 다.
function fakeGetOutput(rows) {
  return async (analysisVersion, scopeLevel, scopeId, outputType) => {
    const key = `${analysisVersion}|${scopeLevel}|${scopeId}|${outputType}`
    return rows[key] || null
  }
}

const POSTING_SCOPE = {
  level: 'posting',
  jobRoleId: 'backend',
  clusterTag: '빅테크·플랫폼',
  clusterId: 'bigtech_platform',
  postingId: 'dp_backend_02',
}

describe('범위 폴백 규칙', () => {
  test('posting 은 자기 → 기업군 → overall 순서로 찾는다', () => {
    expect(fallbackChain(POSTING_SCOPE)).toEqual([
      { level: 'posting', scopeId: 'dp_backend_02' },
      { level: 'cluster', scopeId: 'bigtech_platform' },
      { level: 'overall', scopeId: 'backend' },
    ])
  })

  test('cluster 는 자기 → overall 만 본다', () => {
    expect(fallbackChain({ ...POSTING_SCOPE, level: 'cluster' })).toEqual([
      { level: 'cluster', scopeId: 'bigtech_platform' },
      { level: 'overall', scopeId: 'backend' },
    ])
  })

  test('overall 은 더 넓힐 곳이 없다', () => {
    expect(fallbackChain({ level: 'overall', jobRoleId: 'backend' })).toEqual([
      { level: 'overall', scopeId: 'backend' },
    ])
  })
})

describe('산출물 조합기', () => {
  test('요청한 범위에 행이 있으면 payload 를 그대로 낸다', async () => {
    const payload = { job: 'backend', scope: { level: 'posting', cluster_tag: '빅테크·플랫폼', posting_id: 'dp_backend_02' }, baseline: [1] }
    const getOutput = fakeGetOutput({ 'an_demo_backend|posting|dp_backend_02|interpretation': payload })

    const result = await resolveOutput(getOutput, 'an_demo_backend', 'interpretation', POSTING_SCOPE)

    expect(result.fell_back).toBe(false)
    expect(result.level).toBe('posting')
    expect(result.payload).toBe(payload)
  })

  test('posting 범위 전략이 없으면 그 공고의 기업군으로 떨어지고 scope 를 바꾼다', async () => {
    const stored = { job: 'backend', scope: { level: 'cluster', cluster_tag: '빅테크·플랫폼', posting_id: null }, checklist: [] }
    const getOutput = fakeGetOutput({ 'an_demo_backend|cluster|bigtech_platform|strategy': stored })

    const result = await resolveOutput(getOutput, 'an_demo_backend', 'strategy', POSTING_SCOPE)

    expect(result.fell_back).toBe(true)
    expect(result.level).toBe('cluster')
    expect(result.payload.scope).toEqual({ level: 'cluster', cluster_tag: '빅테크·플랫폼', posting_id: null })
    expect(result.payload.checklist).toBe(stored.checklist)
    // 저장된 payload 자체는 건드리지 않는다.
    expect(stored.scope.level).toBe('cluster')
  })

  test('기업군 행도 없으면 overall 까지 떨어진다', async () => {
    const getOutput = fakeGetOutput({ 'an_demo_backend|overall|backend|roadmap': { job: 'backend', scope: null, project_steps: [] } })

    const result = await resolveOutput(getOutput, 'an_demo_backend', 'roadmap', POSTING_SCOPE)

    expect(result.level).toBe('overall')
    expect(result.payload.scope).toEqual({ level: 'overall', cluster_tag: null, posting_id: null })
  })

  test('아무 범위에도 행이 없으면 빈 값이 아니라 오류다', async () => {
    let thrown = null
    try {
      await loadPayload(fakeGetOutput({}), 'an_demo_backend', 'interpretation', POSTING_SCOPE)
    } catch (error) {
      thrown = error
    }
    expect(thrown.code).toBe('NO_ACTIVE_ANALYSIS')
  })

  test('알 수 없는 범위 수준은 오류다', async () => {
    await expect(resolveOutput(fakeGetOutput({}), 'an_demo_backend', 'interpretation', { level: 'company' }))
      .rejects.toThrow(/알 수 없는 범위 수준/)
  })
})
