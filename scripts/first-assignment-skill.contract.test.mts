import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

const skillUrl = new URL(
  '../skills/ay-ple-first-assignment/SKILL.md',
  import.meta.url,
)

test('First Assignment Skill defines the AY-owned Review contract', async () => {
  const skill = await readFile(skillUrl, 'utf8')

  assertInstructionOrder(skill)
  assert.deepEqual(parseInstructionContract(skill), {
    outcomes: {
      accept: { file: 'apply', next: 'stop' },
      revise: { file: 'unchanged', next: 'fresh-call' },
      reject: { file: 'unchanged', next: 'stop' },
    },
    fileAuthority: 'native',
    gitAuthority: 'native',
    permissionBeforeWrite: true,
    checkpointOnlyWhenMeaningful: true,
  })
  for (const field of [
    'relativePath',
    'contentDigest',
    'text_quote',
    'occurrence',
  ]) {
    assert.match(skill, new RegExp(`\\\`${field}\\\``))
  }
  assert.doesNotMatch(
    skill,
    /requestKey|workspaceId|workspace ID|courseId|Course ID|baseRevision|RawMaterial|StatePatch|UserConfirmation|request_user_input|scratch|revision-bound/i,
  )
})

test('accept applies the reviewed bytes through native authority after Review', async () => {
  await withActualFile(async (actualPath) => {
    const fixture = createFixture(actualPath, [{ outcome: 'accept' }])

    const result = await executeInstructions({
      contract: await loadInstructionContract(),
      initialProposal: 'reviewed assignment',
      meaningfulCheckpoint: true,
      ports: fixture.ports,
    })

    assert.equal(result.outcome, 'accept')
    assert.equal(await readFile(actualPath, 'utf8'), 'reviewed assignment')
    assert.deepEqual(fixture.observation.proposalFileBytes, [
      'original assignment',
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

test('revise keeps bytes unchanged until a fresh proposal and card settle', async () => {
  await withActualFile(async (actualPath) => {
    const fixture = createFixture(actualPath, [
      { outcome: 'revise', feedback: 'include the submission method' },
      { outcome: 'accept' },
    ])

    const result = await executeInstructions({
      contract: await loadInstructionContract(),
      initialProposal: 'first proposal',
      meaningfulCheckpoint: false,
      ports: fixture.ports,
    })

    assert.equal(result.outcome, 'accept')
    assert.deepEqual(fixture.observation.proposalFileBytes, [
      'original assignment',
      'original assignment',
    ])
    assert.deepEqual(fixture.observation.reviewIds, ['review_1', 'review_2'])
    assert.deepEqual(fixture.observation.proposals, [
      'first proposal',
      'first proposal\nRevision feedback: include the submission method',
    ])
    assert.equal(
      await readFile(actualPath, 'utf8'),
      'first proposal\nRevision feedback: include the submission method',
    )
    assert.deepEqual(fixture.observation.app, {
      fileWrites: 0,
      gitCommands: 0,
    })
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 1,
      gitCommands: 0,
    })
  })
})

test('reject leaves the actual file and Git history unchanged', async () => {
  await withActualFile(async (actualPath) => {
    const fixture = createFixture(actualPath, [{ outcome: 'reject' }])

    const result = await executeInstructions({
      contract: await loadInstructionContract(),
      initialProposal: 'rejected proposal',
      meaningfulCheckpoint: true,
      ports: fixture.ports,
    })

    assert.equal(result.outcome, 'reject')
    assert.equal(await readFile(actualPath, 'utf8'), 'original assignment')
    assert.deepEqual(fixture.observation.app, {
      fileWrites: 0,
      gitCommands: 0,
    })
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 0,
      gitCommands: 0,
    })
  })
})

test('accept cannot substitute for native file permission', async () => {
  await withActualFile(async (actualPath) => {
    const fixture = createFixture(actualPath, [{ outcome: 'accept' }], false)

    await assert.rejects(
      executeInstructions({
        contract: await loadInstructionContract(),
        initialProposal: 'reviewed assignment',
        meaningfulCheckpoint: true,
        ports: fixture.ports,
      }),
      /native permission required/,
    )
    assert.equal(await readFile(actualPath, 'utf8'), 'original assignment')
    assert.deepEqual(fixture.observation.app, {
      fileWrites: 0,
      gitCommands: 0,
    })
    assert.deepEqual(fixture.observation.native, {
      fileWrites: 0,
      gitCommands: 0,
    })
  })
})

type Outcome = 'accept' | 'revise' | 'reject'
type OutcomeRule = {
  readonly file: 'apply' | 'unchanged'
  readonly next: 'fresh-call' | 'stop'
}
type InstructionContract = {
  readonly outcomes: Record<Outcome, OutcomeRule>
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
        /- On `(accept|revise|reject)`,([\s\S]*?)(?=\n   - On|\n5\.)/g,
      ),
    ].map(([, outcome, body]) => [outcome, body]),
  ) as Partial<Record<Outcome, string>>

  return {
    outcomes: {
      accept: inferOutcomeRule('accept', bodies.accept),
      revise: inferOutcomeRule('revise', bodies.revise),
      reject: inferOutcomeRule('reject', bodies.reject),
    },
    fileAuthority: /apply only the reviewed changes with native file tools/.test(
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

function inferOutcomeRule(
  outcome: Outcome,
  body: string | undefined,
): OutcomeRule {
  assert.ok(body, `Skill must define an explicit ${outcome} instruction`)
  const file = /apply only the reviewed/.test(body)
    ? 'apply'
    : /keep the actual file unchanged/.test(body)
      ? 'unchanged'
      : undefined
  assert.ok(file, `${outcome} must define its actual-file authority`)

  const next = /fresh `propose_state_patch` call/.test(body)
    ? 'fresh-call'
    : /verify the resulting file|stop applying this/.test(body)
      ? 'stop'
      : undefined
  assert.ok(next, `${outcome} must define fresh-call or stop behavior`)

  return {
    file,
    next,
  }
}

function assertInstructionOrder(skill: string): void {
  const orderedInstructions = [
    'Read the actual target file',
    'Draft the proposed final content',
    'before changing any actual file',
    'Treat the structured result',
    'After an accepted file change',
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
  readonly ports: FixturePorts
}): Promise<{ readonly outcome: 'accept' | 'reject' }> {
  let proposal = input.initialProposal

  while (true) {
    const result = await input.ports.review(proposal)
    const rule = input.contract.outcomes[result.outcome]
    if (rule.file === 'apply') {
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
      proposal = `${proposal}\nRevision feedback: ${result.feedback}`
      continue
    }
    if (result.outcome === 'revise') {
      throw new Error('revise must require a fresh Review call')
    }
    return { outcome: result.outcome }
  }
}

async function withActualFile(
  operation: (actualPath: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-first-assignment-contract-'),
  )
  const actualPath = path.join(root, 'assignment.md')
  await writeFile(actualPath, 'original assignment')
  try {
    await operation(actualPath)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
}
