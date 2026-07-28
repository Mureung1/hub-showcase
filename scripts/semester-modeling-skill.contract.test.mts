import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

const skillUrl = new URL(
  '../skills/ay-ple-semester-modeling/SKILL.md',
  import.meta.url,
)

const initialState = {
  kind: 'ay-ple.semester-workspace',
  formatVersion: 4,
  workspaceId: 'workspace_0123456789abcdef0123456789abcdef',
  semester: {
    yearLevel: 2,
    term: { key: 'fall', displayName: '2학기' },
  },
  snapshot: {
    studentContext: {
      campus: '서울',
    },
    courses: [
      {
        title: '문제해결글쓰기',
        assignments: [
          {
            title: '첫 과제',
            dueAt: {
              knowledge: 'unknown',
              explanation: '선택 자료를 확인하기 전입니다.',
            },
            submissionMethod: '미정',
            notes: '학생 메모 보존',
          },
        ],
      },
    ],
  },
} as const

function proposedState(submissionMethod: string) {
  return {
    ...initialState,
    snapshot: {
      ...initialState.snapshot,
      courses: [
        {
          title: '문제해결글쓰기',
          assignments: [
            {
              title: '첫 과제',
              dueAt: {
                knowledge: 'known',
                value: '2026-08-03 23:59',
              },
              submissionMethod,
              notes: '학생 메모 보존',
            },
          ],
        },
      ],
    },
  }
}

test('SemesterModeling Skill defines the incremental Review harness', async () => {
  const skill = await readFile(skillUrl, 'utf8')

  assert.match(skill, /^name: ay-ple-semester-modeling$/m)
  assert.match(skill, /^description: .*SemesterModel.*Review/m)
  assertInstructionOrder(skill)
  assert.deepEqual(parseInstructionContract(skill), {
    outcomes: {
      accept: { file: 'apply', next: 'stop' },
      revise: { file: 'unchanged', next: 'fresh-call' },
      reject: { file: 'unchanged', next: 'stop' },
    },
    drift: {
      file: 'unchanged',
      next: 'fresh-review',
    },
    fileAuthority: 'native',
    gitAuthority: 'native',
    permissionBeforeWrite: true,
    checkpointOnlyWhenMeaningful: true,
  })
  for (const phrase of [
    '`workspace-state.json`',
    '`snapshot`',
    '`kind`',
    '`formatVersion`',
    '`workspaceId`',
    '`semester`',
    'incrementally reconcile',
    '`known`',
    '`unknown`',
    '`ambiguous`',
    'Course',
    'Assignment',
    'Exam',
    'ScheduleEvent',
    'evidence digests',
    'If a reviewed input drifted',
  ]) {
    assert.match(skill, new RegExp(escapeRegex(phrase)))
  }
  for (const field of [
    'relativePath',
    'contentDigest',
    'text_quote',
    'occurrence',
  ]) {
    assert.match(skill, new RegExp(`\\\`${field}\\\``))
  }
  assert.match(
    skill,
    /Preserve facts\s+outside the current scope[\s\S]*full rebuild only when the user\s+explicitly requests that scope/,
  )
  assert.match(
    skill,
    /explicit file\s+references[\s\S]*conversation and\s+SemesterWorkspace context/i,
  )
  assert.match(
    skill,
    /Do not attach a fact to a Course[\s\S]*unless the sources or conversation establish it/,
  )
  assert.doesNotMatch(
    skill,
    /ActionInvocation:\s*model_semester|require(?:d)? file (?:argument|path)|if (?:no|there (?:is|are) no) file.*(?:stop|ask)|request_user_input/i,
  )
  assert.doesNotMatch(
    skill,
    /courseId|baseRevision|RawMaterial|StatePatch|UserConfirmation|ModelingRun|revision-bound/i,
  )
})

test('accept updates only the reviewed SemesterModel snapshot after Review', async () => {
  await withWorkspaceState(async (statePath) => {
    const fixture = createFixture(statePath, [{ outcome: 'accept' }])
    const proposal = encodeState(proposedState('LMS 과제함'))

    const result = await executeInstructions({
      contract: await loadInstructionContract(),
      initialProposal: proposal,
      meaningfulCheckpoint: true,
      reviseProposal: () => proposal,
      ports: fixture.ports,
    })

    assert.equal(result.outcome, 'accept')
    assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), proposedState('LMS 과제함'))
    assert.deepEqual(fixture.observation.proposalFileBytes, [
      encodeState(initialState),
    ])
    assert.deepEqual(fixture.observation.reviewIds, ['review_1'])
    assert.deepEqual(fixture.observation.app, {
      fileWrites: 0,
      gitCommands: 0,
    })
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 1,
      gitCommands: 1,
    })
  })
})

test('revise preserves the envelope until a fresh proposal settles', async () => {
  await withWorkspaceState(async (statePath) => {
    const fixture = createFixture(statePath, [
      { outcome: 'revise', feedback: '제출 위치를 더 구체적으로 적어 주세요.' },
      { outcome: 'accept' },
    ])
    const firstProposal = encodeState(proposedState('LMS'))
    const revisedProposal = encodeState(proposedState('LMS 과제함'))

    const result = await executeInstructions({
      contract: await loadInstructionContract(),
      initialProposal: firstProposal,
      meaningfulCheckpoint: false,
      reviseProposal: () => revisedProposal,
      ports: fixture.ports,
    })

    assert.equal(result.outcome, 'accept')
    assert.deepEqual(fixture.observation.proposalFileBytes, [
      encodeState(initialState),
      encodeState(initialState),
    ])
    assert.deepEqual(fixture.observation.reviewIds, ['review_1', 'review_2'])
    assert.deepEqual(fixture.observation.proposals, [
      firstProposal,
      revisedProposal,
    ])
    assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), proposedState('LMS 과제함'))
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 1,
      gitCommands: 0,
    })
  })
})

test('reject leaves SemesterModel and Git history unchanged', async () => {
  await withWorkspaceState(async (statePath) => {
    const fixture = createFixture(statePath, [{ outcome: 'reject' }])

    const result = await executeInstructions({
      contract: await loadInstructionContract(),
      initialProposal: encodeState(proposedState('LMS 과제함')),
      meaningfulCheckpoint: true,
      reviseProposal: (proposal) => proposal,
      ports: fixture.ports,
    })

    assert.equal(result.outcome, 'reject')
    assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), initialState)
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 0,
      gitCommands: 0,
    })
  })
})

test('Review acceptance cannot substitute for native file permission', async () => {
  await withWorkspaceState(async (statePath) => {
    const fixture = createFixture(statePath, [{ outcome: 'accept' }], false)

    await assert.rejects(
      executeInstructions({
        contract: await loadInstructionContract(),
        initialProposal: encodeState(proposedState('LMS 과제함')),
        meaningfulCheckpoint: true,
        reviseProposal: (proposal) => proposal,
        ports: fixture.ports,
      }),
      /native permission required/,
    )
    assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), initialState)
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 0,
      gitCommands: 0,
    })
  })
})

test('Review acceptance cannot rebase a drifted SemesterModel input', async () => {
  await withWorkspaceState(async (statePath) => {
    const fixture = createFixture(statePath, [
      { outcome: 'accept' },
      { outcome: 'reject' },
    ])
    const driftedState = {
      ...initialState,
      snapshot: {
        ...initialState.snapshot,
        externalFact: 'concurrent user edit',
      },
    }

    const result = await executeInstructions({
      contract: await loadInstructionContract(),
      initialProposal: encodeState(proposedState('LMS 과제함')),
      meaningfulCheckpoint: true,
      reviseProposal: (proposal) => proposal,
      async afterReview(_result, reviewIndex) {
        if (reviewIndex === 0) {
          await writeFile(statePath, encodeState(driftedState))
        }
      },
      reconcileAfterDrift: async () => encodeState(driftedState),
      ports: fixture.ports,
    })

    assert.equal(result.outcome, 'reject')
    assert.deepEqual(fixture.observation.proposalFileBytes, [
      encodeState(initialState),
      encodeState(driftedState),
    ])
    assert.deepEqual(fixture.observation.reviewIds, ['review_1', 'review_2'])
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 0,
      gitCommands: 0,
    })
    assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), driftedState)
  })
})

type Outcome = 'accept' | 'revise' | 'reject'
type OutcomeRule = {
  readonly file: 'apply' | 'unchanged'
  readonly next: 'fresh-call' | 'stop'
}
type InstructionContract = {
  readonly outcomes: Record<Outcome, OutcomeRule>
  readonly drift: {
    readonly file: 'unchanged'
    readonly next: 'fresh-review'
  }
  readonly fileAuthority: 'app' | 'native'
  readonly gitAuthority: 'app' | 'native'
  readonly permissionBeforeWrite: boolean
  readonly checkpointOnlyWhenMeaningful: boolean
}
type ScriptedResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject' }

function parseInstructionContract(skill: string): InstructionContract {
  const bodies = Object.fromEntries(
    [
      ...skill.matchAll(
        /- On `(accept|revise|reject)`,([\s\S]*?)(?=\n   - On|\n7\.)/g,
      ),
    ].map(([, outcome, body]) => [outcome, body]),
  ) as Partial<Record<Outcome, string>>

  return {
    outcomes: {
      accept: inferOutcomeRule('accept', bodies.accept),
      revise: inferOutcomeRule('revise', bodies.revise),
      reject: inferOutcomeRule('reject', bodies.reject),
    },
    drift: parseDriftContract(skill),
    fileAuthority:
      /apply only the reviewed snapshot\s+changes with native file tools/.test(
        bodies.accept ?? '',
      )
        ? 'native'
        : 'app',
    gitAuthority:
      /never ask or expect it to edit\s+a SemesterWorkspace file or run Git/.test(
        skill,
      )
        ? 'native'
        : 'app',
    permissionBeforeWrite:
      /obtain any required native file permission[\s\S]*apply only the reviewed/.test(
        bodies.accept ?? '',
      ),
    checkpointOnlyWhenMeaningful:
      /When the change is a meaningful\s+checkpoint/.test(skill),
  }
}

function parseDriftContract(skill: string): {
  readonly file: 'unchanged'
  readonly next: 'fresh-review'
} {
  const acceptBody = skill.match(
    /- On `accept`,([\s\S]*?)(?=\n   - On `revise`)/,
  )?.[1]
  assert.ok(acceptBody, 'Skill must define an accept instruction')
  assert.match(
    acceptBody,
    /If a reviewed input drifted, keep the state unchanged and start a fresh\s+reconciliation and Review instead of rebasing/,
  )
  return { file: 'unchanged', next: 'fresh-review' }
}

function inferOutcomeRule(
  outcome: Outcome,
  body: string | undefined,
): OutcomeRule {
  assert.ok(body, `Skill must define an explicit ${outcome} instruction`)
  const file = /apply only the reviewed/.test(body)
    ? 'apply'
    : /keep `workspace-state\.json` unchanged/.test(body)
      ? 'unchanged'
      : undefined
  assert.ok(file, `${outcome} must define its actual-file authority`)

  const next = /fresh\s+`propose_state_patch` call/.test(body)
    ? 'fresh-call'
    : /verify the resulting file|stop applying this/.test(body)
      ? 'stop'
      : undefined
  assert.ok(next, `${outcome} must define fresh-call or stop behavior`)

  return { file, next }
}

function assertInstructionOrder(skill: string): void {
  const orderedInstructions = [
    'Establish the current scope',
    'Read `workspace-state.json`',
    'Draft the proposed snapshot change',
    'Before changing `workspace-state.json`',
    'Treat the structured result',
    'After an accepted snapshot change',
  ]
  let previousIndex = -1
  for (const instruction of orderedInstructions) {
    const index = skill.indexOf(instruction)
    assert.ok(index > previousIndex, `${instruction} must appear in order`)
    previousIndex = index
  }
}

async function loadInstructionContract(): Promise<InstructionContract> {
  return parseInstructionContract(await readFile(skillUrl, 'utf8'))
}

type Observation = {
  readonly proposalFileBytes: string[]
  readonly proposals: string[]
  readonly reviewIds: string[]
  readonly app: { fileWrites: number; gitCommands: number }
  readonly native: { fileWrites: number; gitCommands: number }
}
type FixturePorts = {
  readonly review: (proposal: string) => Promise<ScriptedResult>
  readonly readActualFile: () => Promise<string>
  readonly requestNativeFilePermission: () => Promise<void>
  readonly writeActualFile: Record<
    InstructionContract['fileAuthority'],
    (content: string) => Promise<void>
  >
  readonly runGitCheckpoint: Record<
    InstructionContract['gitAuthority'],
    () => Promise<void>
  >
}

function createFixture(
  actualPath: string,
  results: readonly ScriptedResult[],
  nativePermission = true,
): { readonly ports: FixturePorts; readonly observation: Observation } {
  const scriptedResults = [...results]
  const observation: Observation = {
    proposalFileBytes: [],
    proposals: [],
    reviewIds: [],
    app: { fileWrites: 0, gitCommands: 0 },
    native: { fileWrites: 0, gitCommands: 0 },
  }
  return {
    observation,
    ports: {
      readActualFile: () => readFile(actualPath, 'utf8'),
      async review(proposal) {
        const result = scriptedResults.shift()
        assert.ok(result, 'every fresh Review needs one scripted result')
        observation.proposalFileBytes.push(await readFile(actualPath, 'utf8'))
        observation.proposals.push(proposal)
        observation.reviewIds.push(`review_${observation.reviewIds.length + 1}`)
        return result
      },
      async requestNativeFilePermission() {
        if (!nativePermission) throw new Error('native permission required')
      },
      writeActualFile: {
        async app(content) {
          observation.app.fileWrites += 1
          await writeFile(actualPath, content)
        },
        async native(content) {
          observation.native.fileWrites += 1
          await writeFile(actualPath, content)
        },
      },
      runGitCheckpoint: {
        async app() {
          observation.app.gitCommands += 1
        },
        async native() {
          observation.native.gitCommands += 1
        },
      },
    },
  }
}

async function executeInstructions(input: {
  readonly contract: InstructionContract
  readonly initialProposal: string
  readonly meaningfulCheckpoint: boolean
  readonly reviseProposal: (proposal: string, feedback: string) => string
  readonly afterReview?: (
    result: ScriptedResult,
    reviewIndex: number,
  ) => Promise<void>
  readonly reconcileAfterDrift?: () => Promise<string>
  readonly ports: FixturePorts
}): Promise<{ readonly outcome: 'accept' | 'reject' }> {
  let proposal = input.initialProposal
  let reviewIndex = 0

  while (true) {
    const reviewedInputBytes = await input.ports.readActualFile()
    const result = await input.ports.review(proposal)
    await input.afterReview?.(result, reviewIndex)
    reviewIndex += 1
    const rule = input.contract.outcomes[result.outcome]
    if (rule.file === 'apply') {
      const currentInputBytes = await input.ports.readActualFile()
      if (currentInputBytes !== reviewedInputBytes) {
        assert.deepEqual(input.contract.drift, {
          file: 'unchanged',
          next: 'fresh-review',
        })
        assert.ok(
          input.reconcileAfterDrift,
          'input drift requires a fresh reconciled proposal',
        )
        proposal = await input.reconcileAfterDrift()
        continue
      }
      if (input.contract.permissionBeforeWrite) {
        await input.ports.requestNativeFilePermission()
      }
      await input.ports.writeActualFile[input.contract.fileAuthority](proposal)
      if (
        !input.contract.checkpointOnlyWhenMeaningful ||
        input.meaningfulCheckpoint
      ) {
        await input.ports.runGitCheckpoint[input.contract.gitAuthority]()
      }
    }
    if (rule.next === 'fresh-call') {
      assert.equal(result.outcome, 'revise')
      proposal = input.reviseProposal(proposal, result.feedback)
      continue
    }
    if (result.outcome === 'revise') {
      throw new Error('revise must require a fresh Review call')
    }
    return { outcome: result.outcome }
  }
}

async function withWorkspaceState(
  operation: (statePath: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-semester-modeling-contract-'),
  )
  const statePath = path.join(root, 'workspace-state.json')
  await writeFile(statePath, encodeState(initialState))
  try {
    await operation(statePath)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
}

function encodeState(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
