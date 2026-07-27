import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
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

const execFileAsync = promisify(execFile)
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const bootstrapScript = path.join(
  repositoryRoot,
  '.agents/skills/semester-workspace-init/scripts/bootstrap.mts',
)
const skillPath = path.join(
  repositoryRoot,
  '.agents/skills/semester-workspace-init/SKILL.md',
)
const fixtureGitEnvironment = {
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture Committer',
}

test('Bootstrap Skill delegates only the pre-App native preparation flow', async () => {
  const skill = await readFile(skillPath, 'utf8')
  assert.match(skill, /^name: semester-workspace-init$/m)
  assert.match(skill, /native client's normal file and Git command approval/)
  assert.match(skill, /do\s+not start the App unless the user separately asks/i)
  assert.match(skill, /npm run build -w @ay-ple\/interaction-mcp/)
  assert.ok(
    skill.indexOf('npm run build -w @ay-ple/interaction-mcp') <
      skill.indexOf('node --import tsx'),
  )
  assert.match(skill, /do not create an empty commit/)
  assert.doesNotMatch(
    skill,
    /Browser command|persistent grant|working tree clean|skills\/extraRoots\/set|WorkspaceRegistry.*write/i,
  )
})

test('fresh target becomes a reviewable independent SemesterWorkspace', async () => {
  await withFixture(async (fixtureRoot) => {
    const target = path.join(fixtureRoot, 'fall-workspace')
    await mkdir(target)
    await writeFile(path.join(target, 'notes.md'), 'user material\n')
    await writeFile(
      path.join(target, '.gitignore'),
      '.env\nlegacy-cache/\n',
    )
    await writeFile(path.join(target, '.env'), 'TOKEN=secret\n')
    await mkdir(path.join(target, 'legacy-cache'))
    await writeFile(path.join(target, 'legacy-cache/data'), 'legacy\n')

    const first = await runBootstrap([
      '--target',
      target,
      '--year-level',
      '2',
      '--term-key',
      'fall',
      '--term-display-name',
      '가을 학기',
    ])

    const canonicalTarget = await realpath(target)
    assert.match(
      first.stdout,
      new RegExp(`Prepared SemesterWorkspace: ${escapeRegex(canonicalTarget)}`),
    )
    assert.match(first.stdout, /Scaffold checkpoint: created/)
    assert.match(first.stdout, /Material baseline: not-requested/)
    assert.match(
      first.stdout,
      new RegExp(
        `npm run dev -- --workspace ${escapeRegex(JSON.stringify(canonicalTarget))}`,
      ),
    )
    assert.equal(
      await git(target, ['rev-parse', '--show-toplevel']),
      canonicalTarget,
    )
    const state = JSON.parse(
      await readFile(path.join(target, 'workspace-state.json'), 'utf8'),
    ) as {
      readonly kind: string
      readonly formatVersion: number
      readonly workspaceId: string
      readonly semester: unknown
      readonly snapshot: unknown
    }
    assert.equal(state.kind, 'ay-ple.semester-workspace')
    assert.equal(state.formatVersion, 4)
    assert.match(state.workspaceId, /^workspace_[0-9a-f]{32}$/)
    assert.deepEqual(state.semester, {
      yearLevel: 2,
      term: { key: 'fall', displayName: '가을 학기' },
    })
    assert.deepEqual(state.snapshot, {})
    assert.match(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), /one semester/i)
    assert.equal(
      await readFile(path.join(target, '.gitignore'), 'utf8'),
      '.env\nlegacy-cache/\n/.ay-ple/\n',
    )
    assert.equal(
      await readFile(
        path.join(
          target,
          '.agents/skills/ay-ple-first-assignment/SKILL.md',
        ),
        'utf8',
      ),
      await readFile(
        path.join(repositoryRoot, 'skills/ay-ple-first-assignment/SKILL.md'),
        'utf8',
      ),
    )

    const config = await readFile(
      path.join(target, '.codex/config.toml'),
      'utf8',
    )
    assert.match(config, /\[mcp_servers\.ay_ple_interaction\]/)
    assert.match(config, /enabled_tools = \["propose_state_patch"\]/)
    assert.match(config, /required = true/)
    assert.doesNotMatch(
      config,
      /tool_timeout_sec|cwd\s*=|BROKER_URL\s*=|BROKER_TOKEN\s*=|RUNTIME_BINDING\s*=/,
    )

    const committedPaths = (
      await git(target, [
        'show',
        '--pretty=format:',
        '--name-only',
        'HEAD',
      ])
    )
      .split('\n')
      .filter(Boolean)
      .sort()
    assert.deepEqual(committedPaths, [
      '.agents/skills/ay-ple-first-assignment/SKILL.md',
      '.codex/config.toml',
      '.gitignore',
      'AGENTS.md',
      'workspace-state.json',
    ])
    assert.equal((await git(target, ['status', '--short'])).trim(), '?? notes.md')
    assert.equal(await git(target, ['check-ignore', '.env']), '.env')
    assert.equal(
      await git(target, ['check-ignore', 'legacy-cache/data']),
      'legacy-cache/data',
    )
  })
})

test('existing dirty repository preserves history, remote, and exact rerun bytes', async () => {
  await withFixture(async (fixtureRoot) => {
    const target = path.join(fixtureRoot, 'existing-workspace')
    await mkdir(target)
    await git(target, ['init', '--quiet'])
    await writeFile(path.join(target, 'notes.md'), 'committed\n')
    await writeFile(
      path.join(target, 'AGENTS.md'),
      '# User instructions\n\nPreserve this exact file.\n',
    )
    await git(target, ['add', '--', 'notes.md', 'AGENTS.md'])
    await git(target, ['commit', '--quiet', '-m', 'initial user history'], {
      gitIdentity: true,
    })
    await git(target, ['remote', 'add', 'origin', 'https://example.invalid/user.git'])
    const initialHead = await git(target, ['rev-parse', 'HEAD'])
    await writeFile(path.join(target, 'notes.md'), 'dirty user edit\n')
    await git(target, ['add', '--', 'notes.md'])
    await writeFile(path.join(target, 'unrelated.txt'), 'untracked\n')

    await runBootstrap([
      '--target',
      target,
      '--year-level',
      '3',
      '--term-key',
      'spring',
      '--term-display-name',
      '봄 학기',
    ])

    const bootstrapHead = await git(target, ['rev-parse', 'HEAD'])
    assert.notEqual(bootstrapHead, initialHead)
    assert.equal(await git(target, ['rev-parse', 'HEAD^']), initialHead)
    assert.equal(
      await git(target, ['remote', 'get-url', 'origin']),
      'https://example.invalid/user.git',
    )
    assert.equal(
      await readFile(path.join(target, 'AGENTS.md'), 'utf8'),
      '# User instructions\n\nPreserve this exact file.\n',
    )
    assert.equal(await git(target, ['status', '--short']), [
      'M  notes.md',
      '?? unrelated.txt',
    ].join('\n'))
    const managedBefore = await readManagedBytes(target)
    await writeFile(
      path.join(target, 'AGENTS.md'),
      '# User instructions\n\nDirty user change stays uncommitted.\n',
    )
    const dirtyManagedBefore = await readManagedBytes(target)

    const rerun = await runBootstrap([
      '--target',
      target,
      '--year-level',
      '3',
      '--term-key',
      'spring',
      '--term-display-name',
      '봄 학기',
    ])

    assert.match(rerun.stdout, /Scaffold checkpoint: no-op/)
    assert.match(rerun.stdout, /Material baseline: not-requested/)
    assert.equal(await git(target, ['rev-parse', 'HEAD']), bootstrapHead)
    assert.notDeepEqual(dirtyManagedBefore, managedBefore)
    assert.deepEqual(await readManagedBytes(target), dirtyManagedBefore)
    const rerunStatus = await git(target, ['status', '--short'])
    assert.match(rerunStatus, /M AGENTS\.md/)
    assert.match(rerunStatus, /M  notes\.md/)
    assert.match(rerunStatus, /\?\? unrelated\.txt/)
    await assert.rejects(readFile(path.join(target, '.gitignore')))
  })
})

test('managed-resource conflicts preserve original bytes and Git history', async () => {
  await withFixture(async (fixtureRoot) => {
    const scenarios: readonly {
      readonly name: string
      readonly arrange: (target: string, outside: string) => Promise<void>
      readonly error: RegExp
    }[] = [
      {
        name: 'malformed identity',
        async arrange(target) {
          await writeFile(
            path.join(target, 'workspace-state.json'),
            '{"formatVersion":4,"broken":true}\n',
          )
        },
        error: /workspace-state\.json conflicts[\s\S]*--- existing[\s\S]*--- requested/,
      },
      {
        name: 'divergent built-in Skill',
        async arrange(target) {
          const destination = path.join(
            target,
            '.agents/skills/ay-ple-first-assignment',
          )
          await mkdir(destination, { recursive: true })
          await writeFile(path.join(destination, 'SKILL.md'), 'user version\n')
        },
        error: /Built-in Skill conflict[\s\S]*diff --git/,
      },
      {
        name: 'unmanaged Interaction table',
        async arrange(target) {
          await mkdir(path.join(target, '.codex'))
          await writeFile(
            path.join(target, '.codex/config.toml'),
            '[mcp_servers.ay_ple_interaction]\ncommand = "custom"\n',
          )
        },
        error: /Unmanaged ay_ple_interaction TOML table[\s\S]*--- existing[\s\S]*--- required/,
      },
      {
        name: 'quoted unmanaged Interaction table',
        async arrange(target) {
          await mkdir(path.join(target, '.codex'))
          await writeFile(
            path.join(target, '.codex/config.toml'),
            '[mcp_servers."ay_ple_interaction"]\ncommand = "custom"\n',
          )
        },
        error: /Unmanaged ay_ple_interaction TOML table[\s\S]*--- existing[\s\S]*--- required/,
      },
      {
        name: 'malformed project TOML',
        async arrange(target) {
          await mkdir(path.join(target, '.codex'))
          await writeFile(
            path.join(target, '.codex/config.toml'),
            '[features\nbroken = true\n',
          )
        },
        error: /unsafe or malformed[\s\S]*--- existing[\s\S]*--- required/,
      },
      {
        name: 'symlinked instructions',
        async arrange(target, outside) {
          await writeFile(outside, 'outside instructions\n')
          await symlink(outside, path.join(target, 'AGENTS.md'))
        },
        error: /AGENTS\.md must be a non-symlink regular file/,
      },
      {
        name: 'symlinked managed parent',
        async arrange(target, outside) {
          await mkdir(outside)
          await symlink(outside, path.join(target, '.agents'))
        },
        error: /managed path.*symlink/i,
      },
    ]

    for (const [index, scenario] of scenarios.entries()) {
      const target = path.join(fixtureRoot, `conflict-${index}`)
      const outside = path.join(fixtureRoot, `outside-${index}`)
      await mkdir(target)
      await git(target, ['init', '--quiet'])
      await writeFile(path.join(target, 'sentinel.txt'), `${scenario.name}\n`)
      await scenario.arrange(target, outside)
      await git(target, ['add', '--all'])
      await git(target, ['commit', '--quiet', '-m', 'user bytes'], {
        gitIdentity: true,
      })
      const before = await snapshotRepository(target)
      const head = await git(target, ['rev-parse', 'HEAD'])

      await assert.rejects(
        runBootstrap([
          '--target',
          target,
          '--year-level',
          '2',
          '--term-key',
          'fall',
          '--term-display-name',
          '가을 학기',
        ]),
        scenario.error,
        scenario.name,
      )

      assert.equal(await git(target, ['rev-parse', 'HEAD']), head)
      assert.deepEqual(await snapshotRepository(target), before)
      assert.equal(await git(target, ['status', '--short']), '')
    }
  })
})

test('staged deletion of a managed path is never auto-repaired or committed', async () => {
  await withFixture(async (fixtureRoot) => {
    const target = path.join(fixtureRoot, 'staged-managed-delete')
    await mkdir(target)
    await runBootstrap(defaultArguments(target))
    const head = await git(target, ['rev-parse', 'HEAD'])
    await git(target, ['rm', '--quiet', '--', 'workspace-state.json'])

    await assert.rejects(
      runBootstrap(defaultArguments(target)),
      /managed path has existing Git changes/,
    )

    assert.equal(await git(target, ['rev-parse', 'HEAD']), head)
    assert.equal(await git(target, ['status', '--short']), 'D  workspace-state.json')
  })
})

test('unsafe target topology fails without creating or checkpointing a target', async () => {
  await withFixture(async (fixtureRoot) => {
    const missingAncestorTarget = path.join(
      fixtureRoot,
      'missing-parent',
      'workspace',
    )
    await assert.rejects(
      runBootstrap(defaultArguments(missingAncestorTarget)),
      /Only one missing target leaf/,
    )
    await assert.rejects(realpath(path.dirname(missingAncestorTarget)))

    const foreign = path.join(fixtureRoot, 'foreign')
    const descendant = path.join(foreign, 'workspace')
    await mkdir(descendant, { recursive: true })
    await git(foreign, ['init', '--quiet'])
    await writeFile(path.join(foreign, 'sentinel'), 'foreign\n')
    await git(foreign, ['add', '--', 'sentinel'])
    await git(foreign, ['commit', '--quiet', '-m', 'foreign history'], {
      gitIdentity: true,
    })
    const foreignHead = await git(foreign, ['rev-parse', 'HEAD'])
    await assert.rejects(
      runBootstrap(defaultArguments(descendant)),
      /descendant of foreign repository/,
    )
    assert.equal(await git(foreign, ['rev-parse', 'HEAD']), foreignHead)
    assert.deepEqual(await readdir(descendant), [])

    const indirection = path.join(fixtureRoot, 'indirection')
    const separateGit = path.join(fixtureRoot, 'separate-git')
    await mkdir(indirection)
    await execFileAsync(
      'git',
      ['init', '--quiet', '--separate-git-dir', separateGit, indirection],
    )
    const dotGitBytes = await readFile(path.join(indirection, '.git'))
    await assert.rejects(
      runBootstrap(defaultArguments(indirection)),
      /Gitdir indirection/,
    )
    assert.deepEqual(await readFile(path.join(indirection, '.git')), dotGitBytes)
  })
})

test('user-approved material baseline is a separate explicit-pathspec commit', async () => {
  await withFixture(async (fixtureRoot) => {
    const target = path.join(fixtureRoot, 'baseline-workspace')
    await mkdir(target)
    await writeFile(path.join(target, 'notes.md'), 'approved notes\n')
    await writeFile(path.join(target, 'unrelated.md'), 'not approved\n')
    await writeFile(path.join(target, '.gitignore'), '.env\nlegacy/\n')
    await writeFile(path.join(target, '.env'), 'TOKEN=secret\n')
    await mkdir(path.join(target, 'legacy'))
    await writeFile(path.join(target, 'legacy/state'), 'legacy\n')

    const result = await runBootstrap([
      ...defaultArguments(target),
      '--baseline',
      'notes.md',
    ])

    assert.match(result.stdout, /Scaffold checkpoint: created/)
    assert.match(result.stdout, /Material baseline: created/)
    assert.deepEqual(
      (await git(target, ['log', '--reverse', '--format=%s'])).split('\n'),
      [
        'chore: initialize semester workspace',
        'chore: baseline semester materials',
      ],
    )
    assert.equal(
      await git(target, [
        'show',
        '--pretty=format:',
        '--name-only',
        'HEAD',
      ]),
      'notes.md',
    )
    assert.equal(await git(target, ['status', '--short']), '?? unrelated.md')
    const tracked = (await git(target, ['ls-files'])).split('\n')
    assert.equal(tracked.includes('.env'), false)
    assert.equal(tracked.includes('legacy/state'), false)
  })
})

test('a later material baseline reports its checkpoint when scaffold is no-op', async () => {
  await withFixture(async (fixtureRoot) => {
    const target = path.join(fixtureRoot, 'later-baseline-workspace')
    await mkdir(target)
    await runBootstrap(defaultArguments(target))
    await writeFile(path.join(target, 'late-notes.md'), 'later material\n')

    const result = await runBootstrap([
      ...defaultArguments(target),
      '--baseline',
      'late-notes.md',
    ])

    assert.match(result.stdout, /Scaffold checkpoint: no-op/)
    assert.match(result.stdout, /Material baseline: created/)
    assert.equal(
      await git(target, [
        'show',
        '--pretty=format:',
        '--name-only',
        'HEAD',
      ]),
      'late-notes.md',
    )
  })
})

test('an explicitly requested credential path is never baselined', async () => {
  await withFixture(async (fixtureRoot) => {
    const target = path.join(fixtureRoot, 'credential-baseline-workspace')
    await mkdir(target)
    await runBootstrap(defaultArguments(target))
    const credentialPaths = [
      '.netrc',
      '.npmrc',
      'auth.json',
      'credentials.json',
      'service-account.json',
    ]
    await Promise.all(
      credentialPaths.map((credentialPath) =>
        writeFile(path.join(target, credentialPath), '{"token":"secret"}\n'),
      ),
    )
    const head = await git(target, ['rev-parse', 'HEAD'])

    for (const credentialPath of credentialPaths) {
      await assert.rejects(
        runBootstrap([
          ...defaultArguments(target),
          '--baseline',
          credentialPath,
        ]),
        /Refusing to baseline a credential-like path/,
      )
    }

    assert.equal(await git(target, ['rev-parse', 'HEAD']), head)
    assert.equal(
      (await git(target, ['status', '--short'])).split('\n').sort().join('\n'),
      credentialPaths
        .map((credentialPath) => `?? ${credentialPath}`)
        .sort()
        .join('\n'),
    )
  })
})

test('stale managed command updates without clobbering safe project TOML', async () => {
  await withFixture(async (fixtureRoot) => {
    const target = path.join(fixtureRoot, 'moved-hub-workspace')
    await mkdir(target)
    await runBootstrap(defaultArguments(target))

    const configPath = path.join(target, '.codex/config.toml')
    const initial = await readFile(configPath, 'utf8')
    const stale = `# user-owned project settings
[features]
example = true

${initial.replace(/^command = ".*"$/m, 'command = "../old-hub/dist/stdio.js"')}`
    await writeFile(configPath, stale)
    await git(target, ['add', '--', '.codex/config.toml'])
    await git(target, ['commit', '--quiet', '-m', 'move old hub'], {
      gitIdentity: true,
    })
    const oldHead = await git(target, ['rev-parse', 'HEAD'])

    const result = await runBootstrap(defaultArguments(target))

    assert.match(result.stdout, /Scaffold checkpoint: updated/)
    assert.match(result.stdout, /Material baseline: not-requested/)
    assert.equal(await git(target, ['rev-parse', 'HEAD^']), oldHead)
    const updated = await readFile(configPath, 'utf8')
    assert.match(
      updated,
      /^# user-owned project settings\n\[features\]\nexample = true\n\n/,
    )
    assert.doesNotMatch(updated, /old-hub/)
    assert.match(updated, /packages\/interaction-mcp\/dist\/stdio\.js/)
  })
})

async function runBootstrap(arguments_: readonly string[]): Promise<{
  readonly stdout: string
  readonly stderr: string
}> {
  return execFileAsync(
    process.execPath,
    ['--import', 'tsx', bootstrapScript, ...arguments_],
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
  options: { readonly gitIdentity?: boolean } = {},
): Promise<string> {
  const { stdout } = await execFileAsync('git', arguments_, {
    cwd,
    encoding: 'utf8',
    env: options.gitIdentity
      ? {
          ...process.env,
          ...fixtureGitEnvironment,
        }
      : process.env,
  })
  return stdout.trim()
}

async function readManagedBytes(
  target: string,
): Promise<Readonly<Record<string, string>>> {
  return Object.fromEntries(
    await Promise.all(
      [
        'workspace-state.json',
        'AGENTS.md',
        '.agents/skills/ay-ple-first-assignment/SKILL.md',
        '.codex/config.toml',
      ].map(async (relativePath) => [
        relativePath,
        await readFile(path.join(target, relativePath), 'utf8'),
      ]),
    ),
  )
}

async function snapshotRepository(
  root: string,
): Promise<Readonly<Record<string, string>>> {
  const paths = await listFiles(root)
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (relativePath) => {
        const absolute = path.join(root, relativePath)
        const metadata = await import('node:fs/promises').then(({ lstat }) =>
          lstat(absolute),
        )
        return [
          relativePath,
          metadata.isSymbolicLink()
            ? `symlink:${await import('node:fs/promises').then(({ readlink }) => readlink(absolute))}`
            : (await readFile(absolute)).toString('base64'),
        ]
      }),
    ),
  )
}

async function listFiles(root: string, relative = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), {
    withFileTypes: true,
  })
  const files: string[] = []
  for (const entry of entries) {
    if (relative === '' && entry.name === '.git') continue
    const child = path.join(relative, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, child)))
    } else {
      files.push(child)
    }
  }
  return files.sort()
}

function defaultArguments(target: string): readonly string[] {
  return [
    '--target',
    target,
    '--year-level',
    '2',
    '--term-key',
    'fall',
    '--term-display-name',
    '가을 학기',
  ]
}

async function withFixture(
  operation: (fixtureRoot: string) => Promise<void>,
): Promise<void> {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-workspace-init-'),
  )
  try {
    await operation(await realpath(fixtureRoot))
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
