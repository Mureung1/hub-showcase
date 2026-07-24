/// <reference types="node" />

export type LegacyV2ParityVector = {
  readonly family:
    | 'oversized'
    | 'retry_source_order'
    | 'guard_source_order'
    | 'evidence_order'
  readonly label: string
  readonly expected: 'ready' | 'incompatible'
  readonly bytes: Buffer
}

export const legacyV2ParityVectorCounts = {
  total: 426,
  ready: 414,
  incompatible: 12,
  oversized: 1,
  retrySourceOrder: 1,
  guardSourceOrder: 16,
  evidenceOrder: 408,
} as const

export function createLegacyV2ParityVectors(): readonly LegacyV2ParityVector[] {
  return [
    createOversizedVector(),
    createRetrySourceOrderVector(),
    ...createGuardSourceOrderVectors(),
    ...createEvidenceOrderVectors(),
  ]
}

function createOversizedVector(): LegacyV2ParityVector {
  const materials = Array.from({ length: 7_500 }, (_, index) => ({
    id: `material_${index.toString(16).padStart(32, '0')}`,
    relativePath: `source-${index.toString().padStart(5, '0')}.txt`,
    digest: index.toString(16).padStart(64, '0'),
    mediaType: 'text/plain; charset=utf-8',
    size: 0,
  }))
  return vector(
    'oversized',
    'decoder-valid current v2 over one MiB',
    'ready',
    {
      formatVersion: 2,
      workspaceId: `workspace_${'a'.repeat(32)}`,
      confirmedRevision: 0,
      course: {
        id: `course_${'b'.repeat(32)}`,
        displayName: '대용량 호환성 확인',
      },
      materials,
      assignments: [],
      statePatches: [],
      userConfirmations: [],
      modelingRuns: [],
      executionGuard: null,
      sourceRecovery: null,
    },
  )
}

function createRetrySourceOrderVector(): LegacyV2ParityVector {
  const firstMaterialId = `material_${'1'.repeat(32)}`
  const secondMaterialId = `material_${'2'.repeat(32)}`
  const firstDigest = '3'.repeat(64)
  const secondDigest = '4'.repeat(64)
  const baseRun = {
    courseId: `course_${'b'.repeat(32)}`,
    invocationFingerprint: '5'.repeat(64),
    requestedSkillName: 'ay-ple-first-assignment',
    requestedSkillPath: '/private/ay-ple/skill/SKILL.md',
    recipeName: '첫 과제',
    recipeVersion: '1',
    recipeDigest: '6'.repeat(64),
    argumentsDigest: '7'.repeat(64),
  }
  return vector(
    'retry_source_order',
    'retry source objects compare fieldwise across key order',
    'ready',
    {
      sourceRecovery: null,
      executionGuard: null,
      modelingRuns: [
        {
          id: `run_${'8'.repeat(32)}`,
          actionId: `action_${'9'.repeat(32)}`,
          ...baseRun,
          sourceBaseline: [
            { rawMaterialId: firstMaterialId, digest: firstDigest },
            { rawMaterialId: secondMaterialId, digest: secondDigest },
          ],
          status: 'interrupted',
          validationOutcome: 'unknown',
          recoveryOutcome: { outcome: 'interrupted' },
          createdAt: '2026-07-23T00:00:00.000Z',
          updatedAt: '2026-07-23T00:00:01.000Z',
          settledAt: '2026-07-23T00:00:01.000Z',
        },
        {
          id: `run_${'a'.repeat(32)}`,
          actionId: `action_${'b'.repeat(32)}`,
          ...baseRun,
          sourceBaseline: [
            { digest: firstDigest, rawMaterialId: firstMaterialId },
            { digest: secondDigest, rawMaterialId: secondMaterialId },
          ],
          retryOfRunId: `run_${'8'.repeat(32)}`,
          status: 'completed',
          validationOutcome: 'passed',
          createdAt: '2026-07-23T00:00:02.000Z',
          updatedAt: '2026-07-23T00:00:03.000Z',
          settledAt: '2026-07-23T00:00:03.000Z',
        },
      ],
      userConfirmations: [],
      statePatches: [],
      assignments: [],
      materials: [
        {
          size: 0,
          mediaType: 'text/plain; charset=utf-8',
          digest: firstDigest,
          relativePath: 'first.txt',
          id: firstMaterialId,
        },
        {
          size: 0,
          mediaType: 'text/plain; charset=utf-8',
          digest: secondDigest,
          relativePath: 'second.txt',
          id: secondMaterialId,
        },
      ],
      course: {
        displayName: '직렬화 순서 호환성',
        id: baseRun.courseId,
      },
      confirmedRevision: 0,
      workspaceId: `workspace_${'c'.repeat(32)}`,
      formatVersion: 2,
    },
  )
}

type SourceKey = 'rawMaterialId' | 'digest'

const sourceOrders = [
  ['rawMaterialId', 'digest'],
  ['digest', 'rawMaterialId'],
] as const satisfies readonly (readonly SourceKey[])[]

const guardSourceOrderExpectations = [
  'ready',
  'incompatible',
  'incompatible',
  'incompatible',
  'incompatible',
  'ready',
  'incompatible',
  'incompatible',
  'incompatible',
  'incompatible',
  'ready',
  'incompatible',
  'incompatible',
  'incompatible',
  'incompatible',
  'ready',
] as const satisfies readonly LegacyV2ParityVector['expected'][]

function createGuardSourceOrderVectors(): readonly LegacyV2ParityVector[] {
  const vectors: LegacyV2ParityVector[] = []
  let expectationIndex = 0
  for (const firstRunOrder of sourceOrders) {
    for (const secondRunOrder of sourceOrders) {
      for (const firstGuardOrder of sourceOrders) {
        for (const secondGuardOrder of sourceOrders) {
          const orders = {
            runOrders: [firstRunOrder, secondRunOrder],
            guardOrders: [firstGuardOrder, secondGuardOrder],
          } as const
          vectors.push(
            vector(
              'guard_source_order',
              JSON.stringify(orders),
              guardSourceOrderExpectations[expectationIndex]!,
              createGuardedRunFixture(orders),
            ),
          )
          expectationIndex += 1
        }
      }
    }
  }
  return vectors
}

function createGuardedRunFixture(input: {
  readonly runOrders: readonly [
    readonly SourceKey[],
    readonly SourceKey[],
  ]
  readonly guardOrders: readonly [
    readonly SourceKey[],
    readonly SourceKey[],
  ]
}) {
  const courseId = `course_${'1'.repeat(32)}`
  const runId = `run_${'2'.repeat(32)}`
  const actionId = `action_${'3'.repeat(32)}`
  const materials = [
    {
      id: `material_${'4'.repeat(32)}`,
      relativePath: 'first.txt',
      digest: '5'.repeat(64),
      mediaType: 'text/plain; charset=utf-8',
      size: 0,
    },
    {
      id: `material_${'6'.repeat(32)}`,
      relativePath: 'second.txt',
      digest: '7'.repeat(64),
      mediaType: 'text/plain; charset=utf-8',
      size: 0,
    },
  ]
  const sources = materials.map((material) => ({
    rawMaterialId: material.id,
    digest: material.digest,
  }))
  const nativeCorrelation = {
    threadId: 'thread-guard-parity',
    turnId: 'turn-guard-parity',
  }
  const sourceBaseline = sources.map((source, index) =>
    reorderRecord(source, input.runOrders[index]!),
  )
  const selectedMaterials = sources.map((source, index) =>
    reorderRecord(source, input.guardOrders[index]!),
  )
  return {
    formatVersion: 2,
    workspaceId: `workspace_${'8'.repeat(32)}`,
    confirmedRevision: 0,
    course: {
      id: courseId,
      displayName: 'guard parity',
    },
    materials,
    assignments: [],
    statePatches: [],
    userConfirmations: [],
    modelingRuns: [
      {
        id: runId,
        actionId,
        courseId,
        invocationFingerprint: '9'.repeat(64),
        requestedSkillName: 'ay-ple-first-assignment',
        requestedSkillPath: '/private/ay-ple/skill/SKILL.md',
        recipeName: '첫 과제',
        recipeVersion: '1',
        recipeDigest: 'a'.repeat(64),
        argumentsDigest: 'b'.repeat(64),
        sourceBaseline,
        status: 'running',
        validationOutcome: 'pending',
        createdAt: '2026-07-23T00:00:00.000Z',
        updatedAt: '2026-07-23T00:00:01.000Z',
        nativeCorrelation,
      },
    ],
    executionGuard: {
      operationId: actionId,
      kind: 'assignment_action',
      confirmedRevision: 0,
      materials,
      selectedMaterials,
      scratchRelativePath: `.ay-ple/runtime-scratch/${actionId}`,
      state: 'active',
      createdAt: '2026-07-23T00:00:00.000Z',
      nativeCorrelation,
      runId,
    },
    sourceRecovery: null,
  }
}

const evidenceKeys = [
  'field',
  'rawMaterialId',
  'digest',
  'quote',
] as const

function createEvidenceOrderVectors(): readonly LegacyV2ParityVector[] {
  const permutations = permute(evidenceKeys)
  const patchOrders = permutations.slice(0, 17)
  const vectors: LegacyV2ParityVector[] = []
  for (const patchOrder of patchOrders) {
    for (const assignmentOrder of permutations) {
      const value = createSettledAssignmentFixture()
      const patchEvidence = value.statePatches[0]!.evidence[0]!
      const assignmentEvidence = value.assignments[0]!.evidence[0]!
      value.statePatches[0]!.evidence[0] = reorderRecord(
        patchEvidence,
        patchOrder,
      )
      value.assignments[0]!.evidence[0] = reorderRecord(
        assignmentEvidence,
        assignmentOrder,
      )
      vectors.push(
        vector(
          'evidence_order',
          JSON.stringify({ patchOrder, assignmentOrder }),
          'ready',
          value,
        ),
      )
    }
  }
  return vectors
}

type MutableEvidence = Record<
  'field' | 'rawMaterialId' | 'digest' | 'quote',
  string
>

function createSettledAssignmentFixture() {
  const workspaceId = `workspace_${'1'.repeat(32)}`
  const courseId = `course_${'2'.repeat(32)}`
  const materialId = `material_${'3'.repeat(32)}`
  const assignmentId = `assignment_${'4'.repeat(32)}`
  const patchId = `patch_${'5'.repeat(32)}`
  const evidence = [
    {
      field: 'dueAt',
      rawMaterialId: materialId,
      digest: '6'.repeat(64),
      quote: '마감: 2026-07-31',
    },
    {
      field: 'submissionMethod',
      rawMaterialId: materialId,
      digest: '6'.repeat(64),
      quote: '제출: LMS',
    },
    {
      field: 'title',
      rawMaterialId: materialId,
      digest: '6'.repeat(64),
      quote: '과제: 개요 작성',
    },
  ] satisfies MutableEvidence[]
  const changes = {
    operation: 'assignment.upsert',
    values: {
      title: '개요 작성',
      dueAt: '2026-07-31T23:59:00+09:00',
      submissionMethod: 'LMS',
    },
  }
  const patch = {
    id: patchId,
    workspaceId,
    courseId,
    requestKey: `proposal_${'7'.repeat(32)}`,
    baseRevision: 0,
    summary: '첫 과제 생성',
    changes,
    evidence: evidence.map((candidate) => ({ ...candidate })),
    status: 'applied',
    createdAt: '2026-07-23T00:00:00.000Z',
    applyOutcome: {
      type: 'applied',
      assignmentId,
      resultingRevision: 1,
    },
    canonicalPayload: '',
  }
  patch.canonicalPayload = JSON.stringify({
    requestKey: patch.requestKey,
    workspaceId,
    courseId,
    baseRevision: 0,
    summary: patch.summary,
    changes,
    evidence,
  })
  return {
    formatVersion: 2,
    workspaceId,
    confirmedRevision: 1,
    course: {
      id: courseId,
      displayName: 'evidence parity',
    },
    materials: [
      {
        id: materialId,
        relativePath: 'notice.txt',
        digest: '6'.repeat(64),
        mediaType: 'text/plain; charset=utf-8',
        size: 0,
      },
    ],
    assignments: [
      {
        id: assignmentId,
        courseId,
        title: changes.values.title,
        dueAt: changes.values.dueAt,
        submissionMethod: changes.values.submissionMethod,
        evidence: evidence.map((candidate) => ({ ...candidate })),
      },
    ],
    statePatches: [patch],
    userConfirmations: [
      {
        id: `confirmation_${'8'.repeat(32)}`,
        patchId,
        decisionKey: `decision_${'9'.repeat(32)}`,
        decision: 'accepted',
        settledAt: '2026-07-23T00:00:01.000Z',
        assignmentId,
        resultingRevision: 1,
        outcome: 'applied',
      },
    ],
    modelingRuns: [],
    executionGuard: null,
    sourceRecovery: null,
  }
}

function vector(
  family: LegacyV2ParityVector['family'],
  label: string,
  expected: LegacyV2ParityVector['expected'],
  value: unknown,
): LegacyV2ParityVector {
  return {
    family,
    label,
    expected,
    bytes: Buffer.from(JSON.stringify(value), 'utf8'),
  }
}

function permute<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]]
  return values.flatMap((value, index) =>
    permute(values.filter((_, candidate) => candidate !== index)).map(
      (suffix) => [value, ...suffix],
    ),
  )
}

function reorderRecord<
  T extends Record<string, unknown>,
  K extends keyof T,
>(value: T, keys: readonly K[]): T {
  return Object.fromEntries(
    keys.map((key) => [key, value[key]]),
  ) as T
}
