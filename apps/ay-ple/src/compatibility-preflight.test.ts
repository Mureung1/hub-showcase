import assert from 'node:assert/strict'
import {
  chmod,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type {
  ApplicationCompatibilityDescriptor,
} from './host-contract.js'
import {
  inspectBrowserBundleForTesting,
  runCompatibilityPreflightForTesting,
  type CompatibilityPreflightDependencies,
} from './compatibility-preflight.js'

const signal = new AbortController().signal

test('discovers one supported invocation in exact probe and Browser candidate order', async () => {
  const journal: string[] = []
  const result = await runCompatibilityPreflightForTesting(
    {
      descriptor: compatibility(),
      userHome: '/Users/student',
      signal,
    },
    dependencies({
      journal,
      inspectBrowserCandidate: async ({ candidate, browser }) => {
        journal.push(`browser:${candidate}`)
        if (
          candidate ===
          '/Users/student/Applications/Google Chrome.app'
        ) {
          return {
            status: 'found',
            canonicalPath: candidate,
            bundleId: browser.bundleId,
            version: '150.0.7339.2',
          }
        }
        return { status: 'absent' }
      },
    }),
  )

  assert.deepEqual(journal, [
    'exec:/usr/bin/sw_vers:-productVersion',
    'browser:/Applications/Google Chrome.app',
    'browser:/Users/student/Applications/Google Chrome.app',
  ])
  assert.deepEqual(result, {
    status: 'ready',
    discovered: {
      os: 'darwin',
      arch: 'arm64',
      macosVersion: '26.5.2',
      nodeVersion: '22.22.3',
      npmVersion: '10.9.8',
      browser: {
        name: 'Google Chrome',
        bundleId: 'com.google.Chrome',
        version: '150.0.7339.2',
        canonicalPath:
          '/Users/student/Applications/Google Chrome.app',
      },
    },
  })
})

test('fails closed before commands when platform, architecture, or private Browser location policy drifts', async (t) => {
  const cases: Array<{
    readonly name: string
    readonly descriptor?: ApplicationCompatibilityDescriptor
    readonly overrides?: Partial<CompatibilityPreflightDependencies>
    readonly code: string
  }> = [
    {
      name: 'platform',
      overrides: { platform: 'linux' },
      code: 'unsupported_platform',
    },
    {
      name: 'architecture',
      overrides: { arch: 'x64' },
      code: 'unsupported_architecture',
    },
    {
      name: 'Chrome system location',
      descriptor: compatibility({
        chromeSystem: '/Applications/Chrome Beta.app',
      }),
      code: 'unsupported_browser',
    },
    {
      name: 'Chromium user location',
      descriptor: compatibility({
        chromiumUser: 'Applications/Chromium Nightly.app',
      }),
      code: 'unsupported_browser',
    },
  ]
  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async () => {
      const journal: string[] = []
      const result = await runCompatibilityPreflightForTesting(
        {
          descriptor:
            fixtureCase.descriptor ?? compatibility(),
          userHome: '/Users/student',
          signal,
        },
        dependencies({
          journal,
          ...fixtureCase.overrides,
        }),
      )
      assert.equal(result.status, 'blocked')
      assert.equal(
        result.status === 'blocked' ? result.code : '',
        fixtureCase.code,
      )
      assert.deepEqual(journal, [])
    })
  }
})

test('requires one explicit npm 10.x user-agent token and never executes PATH npm', async (t) => {
  const cases = [
    { name: 'missing', value: undefined },
    {
      name: 'wrong major',
      value: 'npm/11.1.0 node/v22.22.3 darwin arm64',
    },
    {
      name: 'duplicate',
      value: 'npm/10.9.8 npm/10.9.8 node/v22.22.3',
    },
    {
      name: 'malformed',
      value: 'npm/latest node/v22.22.3',
    },
  ] as const
  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async () => {
      const journal: string[] = []
      const result = await runCompatibilityPreflightForTesting(
        {
          descriptor: compatibility(),
          userHome: '/Users/student',
          signal,
        },
        dependencies({
          journal,
          npmUserAgent: fixtureCase.value,
        }),
      )
      assert.equal(result.status, 'blocked')
      assert.equal(
        result.status === 'blocked' ? result.code : '',
        'unsupported_npm',
      )
      assert.deepEqual(journal, [
        'exec:/usr/bin/sw_vers:-productVersion',
      ])
      assert.equal(
        journal.some((entry) => entry.includes('npm')),
        false,
      )
    })
  }
})

test('checks all four Browser candidates in fixed Chrome then Chromium order', async () => {
  const journal: string[] = []
  const result = await runCompatibilityPreflightForTesting(
    {
      descriptor: compatibility(),
      userHome: '/Users/student',
      signal,
    },
    dependencies({
      journal,
      inspectBrowserCandidate: async ({ candidate, browser }) => {
        journal.push(`browser:${candidate}`)
        if (candidate.endsWith('/Chromium.app')) {
          return candidate.startsWith('/Users/')
            ? {
                status: 'found',
                canonicalPath: candidate,
                bundleId: browser.bundleId,
                version: '151.0.1.0',
              }
            : {
                status: 'found',
                canonicalPath: candidate,
                bundleId: 'invalid.bundle',
                version: '151.0.1.0',
              }
        }
        return candidate.startsWith('/Users/')
          ? {
              status: 'found',
              canonicalPath: candidate,
              bundleId: browser.bundleId,
              version: '129.0.0.0',
            }
          : { status: 'absent' }
      },
    }),
  )

  assert.equal(result.status, 'ready')
  assert.deepEqual(journal.slice(1), [
    'browser:/Applications/Google Chrome.app',
    'browser:/Users/student/Applications/Google Chrome.app',
    'browser:/Applications/Chromium.app',
    'browser:/Users/student/Applications/Chromium.app',
  ])
  assert.equal(
    result.status === 'ready'
      ? result.discovered.browser.name
      : '',
    'Chromium',
  )
})

test('malformed macOS output and unsupported Node fail before npm and Browser probes', async (t) => {
  await t.test('malformed macOS output', async () => {
    const journal: string[] = []
    const result = await runCompatibilityPreflightForTesting(
      {
        descriptor: compatibility(),
        userHome: '/Users/student',
        signal,
      },
      dependencies({
        journal,
        macosVersion: 'Sonoma',
      }),
    )
    assert.equal(result.status, 'blocked')
    assert.equal(
      result.status === 'blocked' ? result.code : '',
      'unsupported_macos',
    )
    assert.deepEqual(journal, [
      'exec:/usr/bin/sw_vers:-productVersion',
    ])
  })

  await t.test('unsupported Node', async () => {
    const journal: string[] = []
    const result = await runCompatibilityPreflightForTesting(
      {
        descriptor: compatibility(),
        userHome: '/Users/student',
        signal,
      },
      dependencies({
        journal,
        nodeVersion: '23.0.0',
      }),
    )
    assert.equal(result.status, 'blocked')
    assert.equal(
      result.status === 'blocked' ? result.code : '',
      'unsupported_node',
    )
    assert.deepEqual(journal, [
      'exec:/usr/bin/sw_vers:-productVersion',
    ])
  })
})

test('Browser bundle inspection uses absolute plutil commands and rejects symlink or pathname swap', async (t) => {
  await t.test('valid bundle', async () => {
    const fixture = await createBundleFixture()
    const calls: string[][] = []
    try {
      const result = await inspectBrowserBundleForTesting(
        {
          candidate: fixture.bundle,
          signal,
        },
        {
          execFile: async (executable, args) => {
            calls.push([executable, ...args])
            return args[1] === 'CFBundleIdentifier'
              ? 'com.google.Chrome\n'
              : '150.0.7339.2\n'
          },
        },
      )
      assert.deepEqual(result, {
        status: 'found',
        canonicalPath: fixture.bundle,
        bundleId: 'com.google.Chrome',
        version: '150.0.7339.2',
      })
      assert.deepEqual(calls, [
        [
          '/usr/bin/plutil',
          '-extract',
          'CFBundleIdentifier',
          'raw',
          '-expect',
          'string',
          fixture.plist,
        ],
        [
          '/usr/bin/plutil',
          '-extract',
          'CFBundleShortVersionString',
          'raw',
          '-expect',
          'string',
          fixture.plist,
        ],
      ])
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('symlink bundle', async () => {
    const fixture = await createBundleFixture()
    const alias = `${fixture.bundle}-alias`
    try {
      await symlink(fixture.bundle, alias)
      assert.deepEqual(
        await inspectBrowserBundleForTesting(
          { candidate: alias, signal },
          { execFile: async () => 'must not run' },
        ),
        { status: 'invalid' },
      )
    } finally {
      await rm(alias, { force: true })
      await fixture.cleanup()
    }
  })

  await t.test('pathname swap after plist read', async () => {
    const fixture = await createBundleFixture()
    let swapped = false
    try {
      const result = await inspectBrowserBundleForTesting(
        { candidate: fixture.bundle, signal },
        {
          execFile: async (_executable, args) =>
            args[1] === 'CFBundleIdentifier'
              ? 'com.google.Chrome'
              : '150.0.7339.2',
          async afterPlistRead() {
            if (swapped) return
            swapped = true
            const replacement = `${fixture.plist}-replacement`
            await writeFile(replacement, 'plist\n')
            await rename(replacement, fixture.plist)
          },
        },
      )
      assert.deepEqual(result, { status: 'invalid' })
      assert.equal(swapped, true)
    } finally {
      await fixture.cleanup()
    }
  })
})

function dependencies(
  input: {
    readonly journal: string[]
    readonly macosVersion?: string
    readonly inspectBrowserCandidate?: CompatibilityPreflightDependencies['inspectBrowserCandidate']
    readonly npmUserAgent?: string
  } & Partial<CompatibilityPreflightDependencies>,
): CompatibilityPreflightDependencies {
  const {
    journal,
    macosVersion = '26.5.2',
    inspectBrowserCandidate,
    ...overrides
  } = input
  return {
    platform: 'darwin',
    arch: 'arm64',
    nodeVersion: '22.22.3',
    npmUserAgent:
      Object.hasOwn(input, 'npmUserAgent')
        ? input.npmUserAgent
        : 'npm/10.9.8 node/v22.22.3 darwin arm64',
    async execFile(executable, args) {
      journal.push(`exec:${executable}:${args.join(':')}`)
      assert.equal(executable, '/usr/bin/sw_vers')
      assert.deepEqual(args, ['-productVersion'])
      return macosVersion
    },
    inspectBrowserCandidate:
      inspectBrowserCandidate ??
      (async ({ candidate, browser }) => {
        journal.push(`browser:${candidate}`)
        return {
          status: 'found',
          canonicalPath: candidate,
          bundleId: browser.bundleId,
          version: '150.0.7339.2',
        }
      }),
    ...overrides,
  }
}

function compatibility(
  overrides: {
    readonly chromeSystem?: string
    readonly chromiumUser?: string
  } = {},
): ApplicationCompatibilityDescriptor {
  return {
    schemaVersion: 1,
    application: {
      packageName: 'ay-ple',
      version: '0.1.0-preview.1',
    },
    platform: {
      os: 'darwin',
      arch: 'arm64',
      minimumMacosVersion: '13.5',
    },
    node: { range: '>=22.12 <23' },
    npm: { range: '>=10 <11' },
    browsers: [
      {
        name: 'Google Chrome',
        bundleId: 'com.google.Chrome',
        candidateLocations: {
          system:
            overrides.chromeSystem ??
            '/Applications/Google Chrome.app',
          userHomeRelative: 'Applications/Google Chrome.app',
        },
        minimumMajor: 130,
      },
      {
        name: 'Chromium',
        bundleId: 'org.chromium.Chromium',
        candidateLocations: {
          system: '/Applications/Chromium.app',
          userHomeRelative:
            overrides.chromiumUser ??
            'Applications/Chromium.app',
        },
        minimumMajor: 130,
      },
    ],
    workspaceBundle: {
      descriptorResource: 'resources/workspace-bundle.json',
      descriptorSha256: 'a'.repeat(64),
    },
  }
}

async function createBundleFixture() {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-browser-')),
  )
  await chmod(root, 0o700)
  const bundle = path.join(root, 'Google Chrome.app')
  const plist = path.join(bundle, 'Contents', 'Info.plist')
  await mkdir(path.dirname(plist), {
    mode: 0o700,
    recursive: true,
  })
  await writeFile(plist, 'plist\n', { mode: 0o644 })
  return {
    bundle,
    plist,
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}
