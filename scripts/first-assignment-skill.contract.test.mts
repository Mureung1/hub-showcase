import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

const skillUrl = new URL(
  '../skills/ay-ple-first-assignment/SKILL.md',
  import.meta.url,
)

test('First Assignment Skill owns proposal-before-mutation and result handling', async () => {
  const skill = await readFile(skillUrl, 'utf8')

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

  assert.deepEqual(parseOutcomeRules(skill), {
    accept: { file: 'apply', next: 'stop' },
    revise: { file: 'unchanged', next: 'fresh-call' },
    reject: { file: 'unchanged', next: 'stop' },
  })
  assert.match(skill, /`relativePath`/)
  assert.match(skill, /`contentDigest`/)
  assert.match(skill, /`text_quote`/)
  assert.match(skill, /`occurrence`/)
  assert.match(
    skill,
    /does not edit a SemesterWorkspace file\s+or run Git/,
  )
  assert.match(skill, /independent from native execution\s+approval/)
  assert.doesNotMatch(
    skill,
    /requestKey|workspaceId|workspace ID|courseId|Course ID|baseRevision|RawMaterial|StatePatch|UserConfirmation|request_user_input|scratch|revision-bound/i,
  )
})

test('scripted Review results preserve proposal bytes and keep apply authority native', async () => {
  const skill = await readFile(skillUrl, 'utf8')
  const rules = parseOutcomeRules(skill)

  await withActualFile(async (actualPath) => {
    const observation = await runScriptedReview({
      actualPath,
      app: createObservedApp(),
      nativePermission: true,
      proposals: ['reviewed assignment'],
      results: [{ outcome: 'accept' }],
      rules,
    })

    assert.deepEqual(observation.proposalFileBytes, ['original assignment'])
    assert.equal(await readFile(actualPath, 'utf8'), 'reviewed assignment')
    assert.deepEqual(observation.native, { fileWrites: 1, checkpoints: 1 })
    assert.deepEqual(observation.app, { fileWrites: 0, gitCommands: 0 })
  })

  await withActualFile(async (actualPath) => {
    const observation = await runScriptedReview({
      actualPath,
      app: createObservedApp(),
      nativePermission: true,
      proposals: ['first proposal', 'revised proposal'],
      results: [
        { outcome: 'revise', feedback: 'include the submission method' },
        { outcome: 'accept' },
      ],
      rules,
    })

    assert.deepEqual(observation.proposalFileBytes, [
      'original assignment',
      'original assignment',
    ])
    assert.equal(await readFile(actualPath, 'utf8'), 'revised proposal')
    assert.deepEqual(observation.native, { fileWrites: 1, checkpoints: 1 })
    assert.deepEqual(observation.app, { fileWrites: 0, gitCommands: 0 })
  })

  await withActualFile(async (actualPath) => {
    const observation = await runScriptedReview({
      actualPath,
      app: createObservedApp(),
      nativePermission: true,
      proposals: ['rejected proposal'],
      results: [{ outcome: 'reject' }],
      rules,
    })

    assert.deepEqual(observation.proposalFileBytes, ['original assignment'])
    assert.equal(await readFile(actualPath, 'utf8'), 'original assignment')
    assert.deepEqual(observation.native, { fileWrites: 0, checkpoints: 0 })
    assert.deepEqual(observation.app, { fileWrites: 0, gitCommands: 0 })
  })
})

test('accept does not substitute for native mutation permission', async () => {
  const skill = await readFile(skillUrl, 'utf8')
  const actualRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-first-assignment-permission-'),
  )
  const actualPath = path.join(actualRoot, 'assignment.md')
  await writeFile(actualPath, 'original assignment')

  try {
    await assert.rejects(
      runScriptedReview({
        actualPath,
        app: createObservedApp(),
        nativePermission: false,
        proposals: ['reviewed assignment'],
        results: [{ outcome: 'accept' }],
        rules: parseOutcomeRules(skill),
      }),
      /native permission required/,
    )
    assert.equal(await readFile(actualPath, 'utf8'), 'original assignment')
  } finally {
    await rm(actualRoot, { force: true, recursive: true })
  }
})

type Outcome = 'accept' | 'revise' | 'reject'
type OutcomeRule = {
  readonly file: 'apply' | 'unchanged'
  readonly next: 'fresh-call' | 'stop'
}

function parseOutcomeRules(skill: string): Record<Outcome, OutcomeRule> {
  const bodies = Object.fromEntries(
    [...skill.matchAll(/- On `(accept|revise|reject)`,([\s\S]*?)(?=\n   - On|\n5\.)/g)].map(
      ([, outcome, body]) => [outcome, body],
    ),
  ) as Partial<Record<Outcome, string>>

  assert.match(bodies.accept ?? '', /apply only the reviewed/)
  assert.match(bodies.revise ?? '', /keep the actual file unchanged/)
  assert.match(bodies.revise ?? '', /fresh `propose_state_patch` call/)
  assert.match(bodies.reject ?? '', /keep the actual file unchanged/)

  return {
    accept: { file: 'apply', next: 'stop' },
    revise: { file: 'unchanged', next: 'fresh-call' },
    reject: { file: 'unchanged', next: 'stop' },
  }
}

type ScriptedResult =
  | { readonly outcome: 'accept' }
  | { readonly outcome: 'revise'; readonly feedback: string }
  | { readonly outcome: 'reject' }

type ObservedApp = {
  readonly calls: { fileWrites: number; gitCommands: number }
}

function createObservedApp(): ObservedApp {
  return { calls: { fileWrites: 0, gitCommands: 0 } }
}

async function runScriptedReview(input: {
  readonly actualPath: string
  readonly app: ObservedApp
  readonly nativePermission: boolean
  readonly proposals: readonly string[]
  readonly results: readonly ScriptedResult[]
  readonly rules: Record<Outcome, OutcomeRule>
}) {
  const proposalFileBytes: string[] = []
  const native = { fileWrites: 0, checkpoints: 0 }

  for (let index = 0; index < input.results.length; index += 1) {
    const proposal = input.proposals[index]
    const result = input.results[index]
    assert.ok(proposal)
    assert.ok(result)
    proposalFileBytes.push(await readFile(input.actualPath, 'utf8'))

    const rule = input.rules[result.outcome]
    if (rule.file === 'apply') {
      if (!input.nativePermission) {
        throw new Error('native permission required')
      }
      await writeFile(input.actualPath, proposal)
      native.fileWrites += 1
      native.checkpoints += 1
    }
    if (rule.next === 'fresh-call') {
      assert.equal(result.outcome, 'revise')
      assert.ok(result.feedback.trim())
      assert.ok(input.results[index + 1], 'revise requires a fresh result')
      continue
    }
    assert.equal(index, input.results.length - 1)
  }

  return {
    proposalFileBytes,
    native,
    app: { ...input.app.calls },
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
