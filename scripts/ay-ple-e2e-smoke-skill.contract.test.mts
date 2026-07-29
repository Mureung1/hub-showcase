import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { parse as parseYaml } from 'yaml'

import {
  activateDogfoodWorkspace,
  adoptDogfoodWorkspace,
  stageDogfoodWorkspace,
} from '../.agents/skills/ay-ple-e2e-smoke/scripts/reconcile-dogfood-workspace.mjs'

const execFileAsync = promisify(execFile)
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const skillRoot = path.join(
  repositoryRoot,
  '.agents/skills/ay-ple-e2e-smoke',
)
const bootstrapScript = path.join(
  repositoryRoot,
  '.agents/skills/semester-workspace-init/scripts/bootstrap.mts',
)
const fixtureGitEnvironment = {
  GIT_AUTHOR_EMAIL: 'e2e-fixture@example.com',
  GIT_AUTHOR_NAME: 'E2E Fixture',
  GIT_COMMITTER_EMAIL: 'e2e-fixture@example.com',
  GIT_COMMITTER_NAME: 'E2E Fixture',
}

test('E2E Skill keeps lifecycle policy with Codex and uses a staged handoff', async () => {
  const [skill, fixtureReference, openAiSource] = await Promise.all([
    readFile(path.join(skillRoot, 'SKILL.md'), 'utf8'),
    readFile(
      path.join(skillRoot, 'references/default-fixture.md'),
      'utf8',
    ),
    readFile(path.join(skillRoot, 'agents/openai.yaml'), 'utf8'),
  ])

  assert.match(skill, /Codex runs this repository-development harness/i)
  assert.match(skill, /AY is the product Agent under\s+test/i)
  assert.match(
    skill,
    /never installed as an AY-PLE built-in\s+Product Skill/i,
  )
  assert.match(skill, /stage[\s\S]*\$semester-workspace-init[\s\S]*activate/i)
  assert.match(skill, /staging-ready[\s\S]*exact `HEAD`/i)
  assert.match(
    skill,
    /Do not edit, archive, delete, or reset[\s\S]*app-data[\s\S]*registry/i,
  )
  assert.match(skill, /App[\s\S]*CAS replacement[\s\S]*Product RED/i)
  assert.match(skill, /accept[\s\S]*Review/i)
  assert.match(skill, /retain[\s\S]*(?:workspace|process|Browser)/i)
  assert.match(skill, /arbitrary prepared SemesterWorkspace[\s\S]*review-only/i)
  assert.match(skill, /conflict[\s\S]*fail closed/i)

  for (const phrase of [
    'immutable seed',
    'generated, observable dogfood SemesterWorkspace',
    '`ready`',
    '`reseedable`',
    '`conflict`',
    'accept the Review',
    'retain',
  ]) {
    assert.match(fixtureReference, new RegExp(escapeRegex(phrase), 'i'))
  }
  assert.match(fixtureReference, /existing target remains preserved/i)
  assert.match(fixtureReference, /one-time adoption[\s\S]*\sadopt\s/i)
  assert.match(fixtureReference, /staging-ready[\s\S]*exact `HEAD`/i)
  assert.match(
    fixtureReference,
    /must not edit, archive, delete, or reset[\s\S]*registry/i,
  )
  assert.match(
    fixtureReference,
    /explicit[\s\S]*--workspace[\s\S]*stale same-root binding[\s\S]*CAS/i,
  )
  assert.match(fixtureReference, /Without an explicit[\s\S]*fail closed/i)
  assert.doesNotMatch(fixtureReference, /workspace-registry\.pre-dogfood/i)
  assert.doesNotMatch(fixtureReference, /\/Users\//)
  assert.doesNotMatch(
    `${skill}\n${fixtureReference}\n${openAiSource}`,
    /disposable fixture/i,
  )

  const openAi = parseYaml(openAiSource) as {
    readonly interface?: {
      readonly short_description?: string
      readonly default_prompt?: string
    }
    readonly policy?: {
      readonly allow_implicit_invocation?: boolean
    }
  }
  const description = openAi.interface?.short_description ?? ''
  assert.ok(description.length >= 25 && description.length <= 64)
  assert.match(
    openAi.interface?.default_prompt ?? '',
    /\$ay-ple-e2e-smoke/,
  )
  assert.equal(openAi.policy?.allow_implicit_invocation, true)
})

test('stage, Bootstrap, and activate preserve the prior target until cutover', async () => {
  await withFixture(async ({ fixtureRoot, workspaceRoot }) => {
    await assert.rejects(
      stageDogfoodWorkspace({
        fixtureRoot,
        workspaceRoot,
        confirmReplace: `${workspaceRoot}-wrong`,
      }),
      /confirm-replace/,
    )
    await assert.rejects(lstat(workspaceRoot), { code: 'ENOENT' })

    const staged = await stageDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot,
      confirmReplace: workspaceRoot,
    })
    assert.deepEqual(staged.baselinePaths, [
      'inbox/메모.txt',
      'liberal-arts/exam.pdf',
    ])
    assert.deepEqual(await listFiles(staged.stagingRoot), staged.baselinePaths)
    await assert.rejects(lstat(workspaceRoot), { code: 'ENOENT' })

    await runBootstrap(staged.stagingRoot, staged.baselinePaths)
    const stagedHead = await git(staged.stagingRoot, ['rev-parse', 'HEAD'])
    await assert.rejects(
      activateDogfoodWorkspace({
        fixtureRoot,
        workspaceRoot,
        stagingRoot: staged.stagingRoot,
        confirmReplace: workspaceRoot,
        expectedTargetFingerprint: staged.expectedTargetFingerprint,
        expectedStagingHead: `${stagedHead}-changed`,
      }),
      /staging HEAD changed/,
    )
    await assert.rejects(lstat(workspaceRoot), { code: 'ENOENT' })
    const activated = await activateDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot,
      stagingRoot: staged.stagingRoot,
      confirmReplace: workspaceRoot,
      expectedTargetFingerprint: staged.expectedTargetFingerprint,
      expectedStagingHead: stagedHead,
    })
    assert.equal(activated.workspaceRoot, workspaceRoot)
    assert.equal(
      await git(workspaceRoot, [
        'config',
        '--local',
        '--get',
        'ay-ple.e2eDogfoodFixtureRoot',
      ]),
      fixtureRoot,
    )
    assert.equal(
      await git(workspaceRoot, [
        'config',
        '--local',
        '--get',
        'ay-ple.e2eDogfoodWorkspaceRoot',
      ]),
      workspaceRoot,
    )
    assert.equal(
      await git(workspaceRoot, [
        'status',
        '--porcelain=v1',
        '--untracked-files=all',
        '--ignored=matching',
      ]),
      '',
    )

    const priorHead = await git(workspaceRoot, ['rev-parse', 'HEAD'])
    const priorState = await readFile(
      path.join(workspaceRoot, 'workspace-state.json'),
    )
    const nextStage = await stageDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot,
      confirmReplace: workspaceRoot,
    })
    assert.equal(await git(workspaceRoot, ['rev-parse', 'HEAD']), priorHead)
    assert.deepEqual(
      await readFile(path.join(workspaceRoot, 'workspace-state.json')),
      priorState,
    )
    await rm(nextStage.stagingRoot, { recursive: true })
  })
})

test('replacement safety rejects unowned, dirty, ignored, and unsafe inputs', async () => {
  await withFixture(async ({ root, fixtureRoot, workspaceRoot }) => {
    const staged = await stageDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot,
      confirmReplace: workspaceRoot,
    })
    await runBootstrap(staged.stagingRoot, staged.baselinePaths)
    const stagedHead = await git(staged.stagingRoot, ['rev-parse', 'HEAD'])
    await activateDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot,
      stagingRoot: staged.stagingRoot,
      confirmReplace: workspaceRoot,
      expectedTargetFingerprint: staged.expectedTargetFingerprint,
      expectedStagingHead: stagedHead,
    })

    await mkdir(path.join(workspaceRoot, '.ay-ple'), { recursive: true })
    await writeFile(
      path.join(workspaceRoot, '.ay-ple/ignored.txt'),
      'preserve me\n',
    )
    await assert.rejects(
      stageDogfoodWorkspace({
        fixtureRoot,
        workspaceRoot,
        confirmReplace: workspaceRoot,
      }),
      /ignored files/,
    )
    assert.equal(
      await readFile(
        path.join(workspaceRoot, '.ay-ple/ignored.txt'),
        'utf8',
      ),
      'preserve me\n',
    )
    await rm(path.join(workspaceRoot, '.ay-ple'), { recursive: true })

    await writeFile(path.join(workspaceRoot, 'scratch.txt'), 'dirty\n')
    await assert.rejects(
      stageDogfoodWorkspace({
        fixtureRoot,
        workspaceRoot,
        confirmReplace: workspaceRoot,
      }),
      /untracked/,
    )
    await rm(path.join(workspaceRoot, 'scratch.txt'))

    const unownedRoot = path.join(root, 'unowned')
    await mkdir(unownedRoot)
    await runBootstrap(unownedRoot, [])
    await assert.rejects(
      stageDogfoodWorkspace({
        fixtureRoot,
        workspaceRoot: unownedRoot,
        confirmReplace: unownedRoot,
      }),
      /ownership markers/,
    )

    const legacyRoot = path.join(root, 'legacy-dogfood')
    const legacyStage = await stageDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot: legacyRoot,
      confirmReplace: legacyRoot,
    })
    await runBootstrap(legacyStage.stagingRoot, legacyStage.baselinePaths)
    await rename(legacyStage.stagingRoot, legacyRoot)
    await assert.rejects(
      stageDogfoodWorkspace({
        fixtureRoot,
        workspaceRoot: legacyRoot,
        confirmReplace: legacyRoot,
      }),
      /ownership markers/,
    )
    const legacyHead = await git(legacyRoot, ['rev-parse', 'HEAD'])
    const adopted = await adoptDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot: legacyRoot,
      expectedHead: legacyHead,
      confirmReplace: legacyRoot,
    })
    assert.equal(adopted.head, legacyHead)
    const adoptedStage = await stageDogfoodWorkspace({
      fixtureRoot,
      workspaceRoot: legacyRoot,
      confirmReplace: legacyRoot,
    })
    await rm(adoptedStage.stagingRoot, { recursive: true })

    const unsafeFixture = path.join(root, 'unsafe-fixture')
    await mkdir(unsafeFixture)
    await symlink(
      path.join(fixtureRoot, 'inbox/메모.txt'),
      path.join(unsafeFixture, 'linked.txt'),
    )
    const targetHead = await git(workspaceRoot, ['rev-parse', 'HEAD'])
    await assert.rejects(
      stageDogfoodWorkspace({
        fixtureRoot: unsafeFixture,
        workspaceRoot,
        confirmReplace: workspaceRoot,
      }),
      /Unsafe symlink/,
    )
    assert.equal(await git(workspaceRoot, ['rev-parse', 'HEAD']), targetHead)
  })
})

async function withFixture(
  run: (paths: {
    readonly root: string
    readonly fixtureRoot: string
    readonly workspaceRoot: string
  }) => Promise<void>,
): Promise<void> {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-e2e-skill-')),
  )
  const fixtureRoot = path.join(root, 'fixture')
  const workspaceRoot = path.join(root, 'workspace')
  try {
    await mkdir(path.join(fixtureRoot, 'inbox'), { recursive: true })
    await mkdir(path.join(fixtureRoot, 'liberal-arts'), {
      recursive: true,
    })
    await writeFile(path.join(fixtureRoot, 'inbox/메모.txt'), '학기 메모\n')
    await writeFile(
      path.join(fixtureRoot, 'liberal-arts/exam.pdf'),
      Buffer.from([0, 1, 2, 3]),
    )
    await run({ root, fixtureRoot, workspaceRoot })
  } finally {
    await rm(root, { force: true, recursive: true })
  }
}

async function runBootstrap(
  target: string,
  baselinePaths: readonly string[],
): Promise<void> {
  await execFileAsync(
    'node',
    [
      '--import',
      'tsx',
      bootstrapScript,
      '--target',
      target,
      '--year-level',
      '2',
      '--term-key',
      'first-semester',
      '--term-display-name',
      '1학기',
      ...baselinePaths.flatMap((relativePath) => [
        '--baseline',
        relativePath,
      ]),
    ],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        ...fixtureGitEnvironment,
      },
      encoding: 'utf8',
    },
  )
}

async function git(
  cwd: string,
  arguments_: readonly string[],
): Promise<string> {
  const result = await execFileAsync('git', arguments_, {
    cwd,
    env: {
      ...process.env,
      ...fixtureGitEnvironment,
    },
    encoding: 'utf8',
  })
  return result.stdout.trim()
}

async function listFiles(root: string, relative = ''): Promise<string[]> {
  const files: string[] = []
  const entries = (await readdir(path.join(root, relative), {
    withFileTypes: true,
  })).sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0
  )
  for (const entry of entries) {
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, child))
    } else {
      files.push(child.split(path.sep).join('/'))
    }
  }
  return files
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
