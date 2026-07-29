import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
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
  inspectDogfoodWorkspace,
  reseedDogfoodWorkspace,
  type DogfoodWorkspaceInput,
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
const builtInSkillCatalogRoot = path.join(repositoryRoot, 'skills')
const fixtureGitEnvironment = {
  GIT_AUTHOR_EMAIL: 'e2e-fixture@example.com',
  GIT_AUTHOR_NAME: 'E2E Fixture',
  GIT_COMMITTER_EMAIL: 'e2e-fixture@example.com',
  GIT_COMMITTER_NAME: 'E2E Fixture',
}

test('E2E Skill separates the Codex harness from AY and retains dogfood state', async () => {
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
  assert.match(skill, /reconcile[\s\S]*before (?:starting|launching) AY-PLE/i)
  assert.match(skill, /semester-workspace-init/)
  assert.match(skill, /accept[\s\S]*Review/i)
  assert.match(skill, /retain[\s\S]*(?:workspace|process|Browser)/i)
  assert.match(skill, /arbitrary prepared SemesterWorkspace[\s\S]*review-only/i)
  assert.match(skill, /conflict[\s\S]*fail closed/i)

  assert.match(fixtureReference, /immutable seed/i)
  assert.match(fixtureReference, /generated, observable dogfood SemesterWorkspace/i)
  assert.match(fixtureReference, /ready/)
  assert.match(fixtureReference, /reseedable/)
  assert.match(fixtureReference, /conflict/)
  assert.match(fixtureReference, /accept the Review/i)
  assert.match(fixtureReference, /retain/i)
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
  assert.equal(openAi.policy?.allow_implicit_invocation, false)
})

test('dogfood lifecycle traces missing through Bootstrap, apply, and conflict', async () => {
  await withFixture(async ({ fixtureRoot, workspaceRoot }) => {
    const input = createInput(fixtureRoot, workspaceRoot)
    const missing = await inspectDogfoodWorkspace(input)
    assert.equal(missing.classification, 'reseedable')
    assert.deepEqual(missing.reasons, ['workspace_missing'])
    assert.deepEqual(missing.baselinePaths, [
      'inbox/메모.txt',
      'liberal-arts/exam.pdf',
    ])

    await assert.rejects(
      reseedDogfoodWorkspace({
        ...input,
        confirmReplace: `${workspaceRoot}-wrong`,
      }),
      /confirm-replace/,
    )
    await assert.rejects(lstat(workspaceRoot), { code: 'ENOENT' })

    const reseeded = await reseedDogfoodWorkspace({
      ...input,
      confirmReplace: workspaceRoot,
    })
    assert.deepEqual(reseeded.baselinePaths, missing.baselinePaths)
    assert.deepEqual(await listFiles(workspaceRoot), missing.baselinePaths)

    await runBootstrap(input, missing.baselinePaths)
    const ready = await inspectDogfoodWorkspace(input)
    assert.equal(ready.classification, 'ready')
    assert.deepEqual(ready.reasons, [])

    const statePath = path.join(workspaceRoot, 'workspace-state.json')
    const state = JSON.parse(await readFile(statePath, 'utf8')) as {
      snapshot: Record<string, unknown>
    }
    state.snapshot = { courses: [{ title: '인도신화와철학' }] }
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`)
    await git(workspaceRoot, ['add', '--', 'workspace-state.json'])
    await git(workspaceRoot, [
      'commit',
      '--quiet',
      '-m',
      'feat: model semester fixture',
    ])

    const applied = await inspectDogfoodWorkspace(input)
    assert.equal(applied.classification, 'reseedable')
    assert.ok(applied.reasons.includes('applied_snapshot'))

    await writeFile(path.join(workspaceRoot, 'scratch.txt'), 'inspect me\n')
    const conflict = await inspectDogfoodWorkspace(input)
    assert.equal(conflict.classification, 'conflict')
    assert.deepEqual(conflict.reasons, ['workspace_dirty'])
    const stateBeforeRefusal = await readFile(statePath)
    await assert.rejects(
      reseedDogfoodWorkspace({
        ...input,
        confirmReplace: workspaceRoot,
      }),
      /conflicting workspace/,
    )
    assert.deepEqual(await readFile(statePath), stateBeforeRefusal)
    assert.equal(
      await readFile(path.join(workspaceRoot, 'scratch.txt'), 'utf8'),
      'inspect me\n',
    )
  })
})

test('dogfood reseed is bounded to recognized clean generated workspaces', async () => {
  await withFixture(async ({ root, fixtureRoot, workspaceRoot }) => {
    const input = createInput(fixtureRoot, workspaceRoot)
    const missing = await inspectDogfoodWorkspace(input)
    await reseedDogfoodWorkspace({
      ...input,
      confirmReplace: workspaceRoot,
    })
    await runBootstrap(input, missing.baselinePaths)

    await writeFile(
      path.join(fixtureRoot, 'liberal-arts/exam.pdf'),
      Buffer.from([9, 8, 7, 6]),
    )
    const fixtureDrift = await inspectDogfoodWorkspace(input)
    assert.equal(fixtureDrift.classification, 'reseedable')
    assert.ok(fixtureDrift.reasons.includes('fixture_tree_drift'))

    const catalogCopy = path.join(root, 'catalog')
    await cp(builtInSkillCatalogRoot, catalogCopy, { recursive: true })
    const copiedSkill = path.join(
      catalogCopy,
      'ay-ple-semester-modeling/SKILL.md',
    )
    await writeFile(
      copiedSkill,
      `${await readFile(copiedSkill, 'utf8')}\n<!-- changed catalog -->\n`,
    )
    const catalogDrift = await inspectDogfoodWorkspace({
      ...input,
      builtInSkillCatalogRoot: catalogCopy,
    })
    assert.equal(catalogDrift.classification, 'reseedable')
    assert.ok(
      catalogDrift.reasons.includes('built_in_skill_catalog_drift'),
    )

    const result = await reseedDogfoodWorkspace({
      ...input,
      confirmReplace: workspaceRoot,
    })
    assert.equal(result.action, 'reseeded')
    assert.deepEqual(await listFiles(workspaceRoot), result.baselinePaths)
    await assert.rejects(lstat(path.join(workspaceRoot, '.git')), {
      code: 'ENOENT',
    })
    assert.deepEqual(
      await readFile(path.join(workspaceRoot, 'liberal-arts/exam.pdf')),
      Buffer.from([9, 8, 7, 6]),
    )

    const unsafeFixture = path.join(root, 'unsafe-fixture')
    await mkdir(unsafeFixture)
    await symlink(
      path.join(fixtureRoot, 'inbox/메모.txt'),
      path.join(unsafeFixture, 'linked.txt'),
    )
    const targetBefore = await snapshotTree(workspaceRoot)
    await assert.rejects(
      inspectDogfoodWorkspace(createInput(unsafeFixture, workspaceRoot)),
      /Unsafe symlink/,
    )
    assert.deepEqual(await snapshotTree(workspaceRoot), targetBefore)
  })

  await withFixture(async ({ fixtureRoot, workspaceRoot }) => {
    const input = createInput(fixtureRoot, workspaceRoot)
    const missing = await inspectDogfoodWorkspace(input)
    await reseedDogfoodWorkspace({
      ...input,
      confirmReplace: workspaceRoot,
    })
    await runBootstrap(input, missing.baselinePaths)
    await writeFile(path.join(workspaceRoot, 'unexpected.md'), 'committed\n')
    await git(workspaceRoot, ['add', '--', 'unexpected.md'])
    await git(workspaceRoot, [
      'commit',
      '--quiet',
      '-m',
      'docs: add unexpected fixture note',
    ])

    const conflict = await inspectDogfoodWorkspace(input)
    assert.equal(conflict.classification, 'conflict')
    assert.ok(conflict.reasons.includes('unexpected_tracked_path'))
    const head = await git(workspaceRoot, ['rev-parse', 'HEAD'])
    await assert.rejects(
      reseedDogfoodWorkspace({
        ...input,
        confirmReplace: workspaceRoot,
      }),
      /conflicting workspace/,
    )
    assert.equal(await git(workspaceRoot, ['rev-parse', 'HEAD']), head)

    const symlinkedGitRoot = path.join(path.dirname(workspaceRoot), 'linked-git')
    await mkdir(symlinkedGitRoot)
    await symlink(
      path.join(workspaceRoot, '.git'),
      path.join(symlinkedGitRoot, '.git'),
    )
    const unsafeGit = await inspectDogfoodWorkspace(
      createInput(fixtureRoot, symlinkedGitRoot),
    )
    assert.equal(unsafeGit.classification, 'conflict')
    assert.deepEqual(unsafeGit.reasons, ['workspace_not_exact_git_root'])
  })
})

function createInput(
  fixtureRoot: string,
  workspaceRoot: string,
): DogfoodWorkspaceInput {
  return {
    fixtureRoot,
    workspaceRoot,
    builtInSkillCatalogRoot,
    yearLevel: 2,
    termKey: 'first-semester',
    termDisplayName: '1학기',
  }
}

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
  input: DogfoodWorkspaceInput,
  baselinePaths: readonly string[],
): Promise<void> {
  const arguments_ = [
    '--import',
    'tsx',
    bootstrapScript,
    '--target',
    input.workspaceRoot,
    '--year-level',
    String(input.yearLevel),
    '--term-key',
    input.termKey,
    '--term-display-name',
    input.termDisplayName,
    ...baselinePaths.flatMap((relativePath) => [
      '--baseline',
      relativePath,
    ]),
  ]
  await execFileAsync('node', arguments_, {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      ...fixtureGitEnvironment,
    },
    encoding: 'utf8',
  })
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

async function snapshotTree(
  root: string,
): Promise<Readonly<Record<string, string>>> {
  const snapshot: Record<string, string> = {}
  for (const relativePath of await listFiles(root)) {
    snapshot[relativePath] = (
      await readFile(path.join(root, ...relativePath.split('/')))
    ).toString('base64')
  }
  return snapshot
}
