import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RuntimeReleaseAuthorityError,
  type RuntimeResolverBundleInput,
  type RuntimeResolveProgress,
  type VerifiedRuntime,
} from '@ay-ple/runtime-release'
import type {
  VerifiedBundleSource,
} from '@ay-ple/semester-workspace'
import {
  ServerStartupCleanupError,
  type CreateServerAppOptions,
  type ServerApplication,
} from '@ay-ple/server'

import type {
  PreparedApplicationRoots,
} from './application-roots.js'
import {
  ApplicationStartupError,
  admitApplicationStartupForTesting,
  type ApplicationStartupDependencies,
} from './application-startup.js'
import type {
  CompatibilityPreflightReady,
} from './compatibility-preflight.js'
import type {
  VerifiedPackageResources,
  VerifiedStaticSite,
} from './package-resources.js'

const signal = new AbortController().signal

test('orders package, compatibility, roots, Runtime, and delayed Server construction', async () => {
  const fixture = startupFixture()
  const journal: string[] = []
  const dependencies = successfulDependencies(fixture, journal)

  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    dependencies,
  )
  assert.deepEqual(journal, [
    'package',
    'user',
    'compatibility',
    'roots',
  ])
  assert.equal(admission.staticSite, fixture.staticSite)
  assert.equal(admission.appDataRoot, fixture.roots.appDataRoot)
  assert.equal(
    admission.preflight.compatibilityDescriptorSha256,
    'a'.repeat(64),
  )
  assert.deepEqual(
    admission.preflight.discovered,
    compatibilityReady().discovered,
  )
  assert.equal(Object.isFrozen(admission.preflight), true)
  assert.equal(
    Object.isFrozen(admission.preflight.discovered.browser),
    true,
  )

  const progress: RuntimeResolveProgress[] = []
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal,
    report: (entry) => progress.push(entry),
  })
  assert.deepEqual(journal, [
    'package',
    'user',
    'compatibility',
    'roots',
    'resolver-bundle',
    'resolve',
  ])
  assert.equal(prepared.runtime, fixture.verifiedRuntime)
  assert.deepEqual(progress, [{ phase: 'ready' }])

  const application = await prepared.createServerAtOrigin(
    'http://127.0.0.1:43123',
  )
  assert.equal(application, fixture.serverApplication)
  assert.deepEqual(journal, [
    'package',
    'user',
    'compatibility',
    'roots',
    'resolver-bundle',
    'resolve',
    'server',
    'spawn-reverify',
  ])
  assert.equal(fixture.calls.resolverBundle, 1)
  assert.equal(fixture.calls.resolve, 1)
  assert.equal(fixture.calls.server, 1)
  assert.equal(fixture.calls.spawnRuntime, fixture.verifiedRuntime)

  const resolverInput = fixture.calls.resolverInput!
  assert.equal(
    resolverInput.descriptor,
    fixture.resources.runtime.descriptor,
  )
  assert.equal(
    resolverInput.canonicalManifestBytes,
    fixture.resources.runtime.canonicalManifestBytes,
  )
  assert.deepEqual(resolverInput.owner, validOwner())
  assert.deepEqual(resolverInput.application, {
    packageName: 'ay-ple',
    version: '0.1.0-preview.1',
  })
  assert.equal(
    resolverInput.canonicalManifestResource,
    'resources/runtime/manifest.json',
  )
  assert.equal(resolverInput.target, 'darwin-arm64')
  assert.equal(resolverInput.runtimeContractVersion, 1)

  const publicPreview = fixture.calls.serverOptions!.publicPreview!
  assert.equal(publicPreview.origin, 'http://127.0.0.1:43123')
  assert.equal(
    publicPreview.runtime.environment.home,
    fixture.roots.controlled.home,
  )
  assert.equal(
    publicPreview.setup.bundleSource,
    fixture.resources.workspace.source,
  )
  assert.equal(
    publicPreview.setup.requiredApplicationCommand,
    'npx ay-ple@0.1.0-preview.1',
  )
  assert.deepEqual(publicPreview.setup.release, {
    application: {
      packageName: 'ay-ple',
      packageVersion: '0.1.0-preview.1',
    },
    runtime: {
      releaseDescriptorSha256: 'd'.repeat(64),
      manifestSha256: 'e'.repeat(64),
      releaseId: '0.1.0',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    bundle: {
      descriptorSha256: 'b'.repeat(64),
      completeTreeSha256: 'c'.repeat(64),
    },
  })
})

test('package, compatibility, and root failure stop every later effect', async (t) => {
  const cases = [
    {
      name: 'package',
      expected: ['package'],
      override: (
        fixture: ReturnType<typeof startupFixture>,
        journal: string[],
      ): Partial<ApplicationStartupDependencies> => ({
        verifyPackageResources: async () => {
          journal.push('package')
          throw new Error('private package path')
        },
      }),
    },
    {
      name: 'compatibility',
      expected: ['package', 'user', 'compatibility'],
      override: (
        _fixture: ReturnType<typeof startupFixture>,
        journal: string[],
      ): Partial<ApplicationStartupDependencies> => ({
        runCompatibilityPreflight: async () => {
          journal.push('compatibility')
          return {
            status: 'blocked',
            code: 'unsupported_npm',
            found: 'npm 11.0.0',
            supported: '>=10 <11',
            remediation: 'npm 10.x로 다시 실행하세요.',
          }
        },
      }),
    },
    {
      name: 'roots',
      expected: ['package', 'user', 'compatibility', 'roots'],
      override: (
        _fixture: ReturnType<typeof startupFixture>,
        journal: string[],
      ): Partial<ApplicationStartupDependencies> => ({
        createApplicationRoots: async () => {
          journal.push('roots')
          throw new Error('private app data path')
        },
      }),
    },
  ] as const

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async () => {
      const fixture = startupFixture()
      const journal: string[] = []
      const dependencies = {
        ...successfulDependencies(fixture, journal),
        ...fixtureCase.override(fixture, journal),
      }
      await assert.rejects(
        admitApplicationStartupForTesting(
          startupInput(),
          dependencies,
        ),
        ApplicationStartupError,
      )
      assert.deepEqual(journal, fixtureCase.expected)
      assert.equal(fixture.calls.resolverBundle, 0)
      assert.equal(fixture.calls.resolve, 0)
      assert.equal(fixture.calls.server, 0)
    })
  }
})

test('validates resolver owner before constructing D1 and creates one bundle', async () => {
  const fixture = startupFixture()
  const journal: string[] = []
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    successfulDependencies(fixture, journal),
  )

  await assert.rejects(
    admission.prepare({
      owner: {
        applicationInstanceNonce: 'NOT-HEX',
        processStartIdentity: '',
      },
      signal,
      report: () => {},
    }),
    (error: unknown) =>
      error instanceof ApplicationStartupError &&
      error.failure.code === 'application_configuration_invalid',
  )
  assert.equal(fixture.calls.resolverBundle, 0)

  await admission.prepare({
    owner: validOwner(),
    signal,
    report: () => {},
  })
  await admission.prepare({
    owner: validOwner(),
    signal,
    report: () => {},
  })
  await assert.rejects(
    admission.prepare({
      owner: {
        ...validOwner(),
        applicationInstanceNonce: 'b'.repeat(32),
      },
      signal,
      report: () => {},
    }),
    hasStartupCode('application_configuration_invalid'),
  )
  assert.equal(fixture.calls.resolverBundle, 1)
  assert.equal(fixture.calls.resolve, 1)
})

test('snapshots the OS user authority across compatibility probes', async () => {
  const fixture = startupFixture()
  const user = {
    homedir: '/Users/student',
    uid: 501,
  }
  let rootsUser: typeof user | undefined
  const dependencies: ApplicationStartupDependencies = {
    ...successfulDependencies(fixture, []),
    readApplicationUserRecord: () => user,
    async runCompatibilityPreflight() {
      user.homedir = '/Users/attacker'
      user.uid = 502
      return compatibilityReady()
    },
    async createApplicationRoots(_input, admittedUser) {
      rootsUser = admittedUser
      return fixture.roots
    },
  }

  await admitApplicationStartupForTesting(
    startupInput(),
    dependencies,
  )

  assert.deepEqual(rootsUser, {
    homedir: '/Users/student',
    uid: 501,
  })
})

test('cancellation before package verification leaves every effect at zero', async () => {
  const fixture = startupFixture()
  const controller = new AbortController()
  controller.abort()
  const journal: string[] = []

  await assert.rejects(
    admitApplicationStartupForTesting(
      {
        ...startupInput(),
        signal: controller.signal,
      },
      successfulDependencies(fixture, journal),
    ),
    hasStartupCode('runtime_cancelled'),
  )
  assert.deepEqual(journal, [])
  assert.equal(fixture.calls.resolverBundle, 0)
  assert.equal(fixture.calls.server, 0)
})

test('rejects resolved Runtime identity drift before Server capability exists', async () => {
  const fixture = startupFixture()
  fixture.verifiedRuntime = {
    ...fixture.verifiedRuntime,
    identity: {
      ...fixture.verifiedRuntime.identity,
      releaseId: '9.9.9',
    },
  }
  const journal: string[] = []
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    successfulDependencies(fixture, journal),
  )

  await assert.rejects(
    admission.prepare({
      owner: validOwner(),
      signal,
      report: () => {},
    }),
    hasStartupCode('runtime_incompatible'),
  )
  assert.equal(fixture.calls.server, 0)
})

test('requires spawn reverify to return the exact VerifiedRuntime object', async () => {
  const fixture = startupFixture()
  fixture.spawnResult = {
    ...fixture.verifiedRuntime,
    identity: { ...fixture.verifiedRuntime.identity },
  }
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    successfulDependencies(fixture, []),
  )
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal,
    report: () => {},
  })

  await assert.rejects(
    prepared.createServerAtOrigin('http://127.0.0.1:43123'),
    hasStartupCode('runtime_incompatible'),
  )
})

test('maps Runtime authority failure without diagnostic evidence', async () => {
  const fixture = startupFixture()
  const dependencies = {
    ...successfulDependencies(fixture, []),
    createRuntimeResolverBundle: () => ({
      resolver: {
        async resolve() {
          throw new RuntimeReleaseAuthorityError(
            {
              code: 'runtime_integrity_failed',
              retryable: false,
              remediation: 'Runtime을 다시 준비하세요.',
            },
          {
            kind: 'test_runtime_diagnostic',
            rawPath: '/private/runtime',
            digest: 'secret',
            },
          )
        },
      },
      spawnBoundary: {
        async verifyForSpawn({ runtime }) {
          return runtime
        },
      },
    }),
  }
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    dependencies,
  )

  let failure: unknown
  try {
    await admission.prepare({
      owner: validOwner(),
      signal,
      report: () => {},
    })
  } catch (error) {
    failure = error
  }
  assert.equal(failure instanceof ApplicationStartupError, true)
  assert.deepEqual(
    failure instanceof ApplicationStartupError
      ? failure.failure
      : null,
    {
      code: 'runtime_integrity_failed',
      retryable: false,
      remediation: 'Runtime을 다시 준비하세요.',
    },
  )
  assert.equal(JSON.stringify(failure).includes('/private/runtime'), false)
  assert.equal(JSON.stringify(failure).includes('secret'), false)
})

test('does not construct C before an exact dynamic loopback Origin is supplied', async () => {
  const fixture = startupFixture()
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    successfulDependencies(fixture, []),
  )
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal,
    report: () => {},
  })
  assert.equal(fixture.calls.server, 0)

  for (const invalidOrigin of [
    'http://localhost:3000',
    'http://127.0.0.1:80',
    'http://127.0.0.1:65536',
    'http://127.0.0.1:43123/',
  ]) {
    await assert.rejects(
      prepared.createServerAtOrigin(invalidOrigin),
      hasStartupCode('application_configuration_invalid'),
    )
  }
  assert.equal(fixture.calls.server, 0)
})

test('foreground cancellation after Runtime resolution blocks C construction', async () => {
  const fixture = startupFixture()
  const controller = new AbortController()
  const admission = await admitApplicationStartupForTesting(
    {
      ...startupInput(),
      signal: controller.signal,
    },
    successfulDependencies(fixture, []),
  )
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal: controller.signal,
    report: () => {},
  })

  controller.abort()

  await assert.rejects(
    prepared.createServerAtOrigin('http://127.0.0.1:43123'),
    hasStartupCode('runtime_cancelled'),
  )
  assert.equal(fixture.calls.server, 0)
  assert.equal(fixture.calls.spawnRuntime, undefined)
})

test('closes a constructed Server when foreground cancellation wins the return race', async () => {
  const fixture = startupFixture()
  const controller = new AbortController()
  let closeCalls = 0
  const racedApplication: ServerApplication = {
    ...fixture.serverApplication,
    async close() {
      closeCalls += 1
    },
  }
  const dependencies: ApplicationStartupDependencies = {
    ...successfulDependencies(fixture, []),
    async createServerApplication() {
      fixture.calls.server += 1
      controller.abort()
      return racedApplication
    },
  }
  const admission = await admitApplicationStartupForTesting(
    {
      ...startupInput(),
      signal: controller.signal,
    },
    dependencies,
  )
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal: controller.signal,
    report: () => {},
  })

  await assert.rejects(
    prepared.createServerAtOrigin('http://127.0.0.1:43123'),
    hasStartupCode('runtime_cancelled'),
  )
  assert.equal(fixture.calls.server, 1)
  assert.equal(closeCalls, 1)
})

test('preserves post-construction cleanup authority and never creates a second Server', async () => {
  const fixture = startupFixture()
  const controller = new AbortController()
  let closeCalls = 0
  let retryCalls = 0
  const cleanupError = new ServerStartupCleanupError(
    async ({ signal: retrySignal }) => {
      retryCalls += 1
      assert.equal(retrySignal.aborted, false)
      return {
        status: 'closed',
        processTreeGone: true,
      }
    },
  )
  const ambiguousApplication: ServerApplication = {
    ...fixture.serverApplication,
    async close() {
      closeCalls += 1
      throw cleanupError
    },
  }
  const dependencies: ApplicationStartupDependencies = {
    ...successfulDependencies(fixture, []),
    async createServerApplication() {
      fixture.calls.server += 1
      controller.abort()
      return ambiguousApplication
    },
  }
  const admission = await admitApplicationStartupForTesting(
    {
      ...startupInput(),
      signal: controller.signal,
    },
    dependencies,
  )
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal: controller.signal,
    report: () => {},
  })

  let exposed: unknown
  try {
    await prepared.createServerAtOrigin(
      'http://127.0.0.1:43123',
    )
  } catch (error) {
    exposed = error
  }
  assert.equal(exposed, cleanupError)
  assert.ok(exposed instanceof ServerStartupCleanupError)
  assert.deepEqual(
    await exposed.close({
      signal: new AbortController().signal,
    }),
    {
      status: 'closed',
      processTreeGone: true,
    },
  )
  await assert.rejects(
    prepared.createServerAtOrigin(
      'http://127.0.0.1:43123',
    ),
    (error: unknown) => error === cleanupError,
  )
  assert.equal(fixture.calls.server, 1)
  assert.equal(closeCalls, 1)
  assert.equal(retryCalls, 1)
})

test('preserves C startup cleanup authority before any Server is returned', async () => {
  const fixture = startupFixture()
  let retryCalls = 0
  const cleanupError = new ServerStartupCleanupError(
    async ({ signal: retrySignal }) => {
      retryCalls += 1
      assert.equal(retrySignal.aborted, false)
      return {
        status: 'closed',
        processTreeGone: true,
      }
    },
  )
  const dependencies: ApplicationStartupDependencies = {
    ...successfulDependencies(fixture, []),
    async createServerApplication() {
      fixture.calls.server += 1
      throw cleanupError
    },
  }
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    dependencies,
  )
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal,
    report: () => {},
  })

  let exposed: unknown
  try {
    await prepared.createServerAtOrigin(
      'http://127.0.0.1:43123',
    )
  } catch (error) {
    exposed = error
  }
  assert.equal(exposed, cleanupError)
  assert.ok(exposed instanceof ServerStartupCleanupError)
  assert.deepEqual(
    await exposed.close({
      signal: new AbortController().signal,
    }),
    {
      status: 'closed',
      processTreeGone: true,
    },
  )
  await assert.rejects(
    prepared.createServerAtOrigin(
      'http://127.0.0.1:43123',
    ),
    (error: unknown) => error === cleanupError,
  )
  assert.equal(fixture.calls.server, 1)
  assert.equal(retryCalls, 1)
})

test('constructs one Server for one exact Origin and rejects rebinding', async () => {
  const fixture = startupFixture()
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    successfulDependencies(fixture, []),
  )
  const prepared = await admission.prepare({
    owner: validOwner(),
    signal,
    report: () => {},
  })

  const first = await prepared.createServerAtOrigin(
    'http://127.0.0.1:43123',
  )
  const second = await prepared.createServerAtOrigin(
    'http://127.0.0.1:43123',
  )
  assert.equal(first, second)
  assert.equal(fixture.calls.server, 1)

  await assert.rejects(
    prepared.createServerAtOrigin('http://127.0.0.1:43124'),
    hasStartupCode('application_configuration_invalid'),
  )
  assert.equal(fixture.calls.server, 1)
})

test('maps synchronous resolver composition failure without private cause', async () => {
  const fixture = startupFixture()
  const dependencies: ApplicationStartupDependencies = {
    ...successfulDependencies(fixture, []),
    createRuntimeResolverBundle() {
      throw new Error('/private/package/runtime descriptor secret')
    },
  }
  const admission = await admitApplicationStartupForTesting(
    startupInput(),
    dependencies,
  )

  let failure: unknown
  try {
    await admission.prepare({
      owner: validOwner(),
      signal,
      report: () => {},
    })
  } catch (error) {
    failure = error
  }
  assert.equal(
    failure instanceof ApplicationStartupError &&
      failure.failure.code === 'runtime_recovery_required',
    true,
  )
  assert.equal(JSON.stringify(failure).includes('/private'), false)
  assert.equal(JSON.stringify(failure).includes('secret'), false)
})

function startupFixture() {
  const staticSite: VerifiedStaticSite = {
    entryPaths: ['index.html'],
    completeTreeSha256: 'f'.repeat(64),
    has: (relativePath) => relativePath === 'index.html',
    read: (relativePath) =>
      relativePath === 'index.html'
        ? Buffer.from('<main>AY-PLE</main>')
        : null,
  }
  const bundleSource = {
    descriptor: {
      schemaVersion: 1,
      bundleId: 'ay-ple.workspace-bundle.v1',
      roots: [],
      completeTreeSha256: 'c'.repeat(64),
    },
    descriptorSha256: 'b'.repeat(64),
    completeTreeSha256: 'c'.repeat(64),
    files: [],
  } as unknown as VerifiedBundleSource
  const resources: VerifiedPackageResources = {
    packageRoot: '/Applications/AY-PLE/package',
    compatibility: compatibility(),
    compatibilityDescriptorSha256: 'a'.repeat(64),
    runtime: {
      descriptor: runtimeDescriptor(),
      releaseDescriptorSha256: 'd'.repeat(64),
      canonicalManifestResource: 'resources/runtime/manifest.json',
      canonicalManifestBytes: Uint8Array.of(1, 2, 3),
    },
    workspace: {
      descriptorResource: 'resources/workspace-bundle.json',
      source: bundleSource,
    },
    staticSite,
  }
  const roots: PreparedApplicationRoots = {
    packageRoot: resources.packageRoot,
    appDataRoot:
      '/Users/student/Library/Application Support/AY-PLE',
    userHome: '/Users/student',
    controlled: {
      runtimeStateRoot:
        '/Users/student/Library/Application Support/AY-PLE/runtime',
      authOnlyBootstrapCwd:
        '/Users/student/Library/Application Support/AY-PLE/runtime/auth-bootstrap',
      home:
        '/Users/student/Library/Application Support/AY-PLE/runtime/home',
      codexHome:
        '/Users/student/Library/Application Support/AY-PLE/runtime/codex-home',
      codexSqliteHome:
        '/Users/student/Library/Application Support/AY-PLE/runtime/codex-sqlite-home',
      tempDirectory:
        '/Users/student/Library/Application Support/AY-PLE/runtime/temp',
    },
    controlledRootPaths: [],
    admittedWorkspace: null,
    admittedWorkspaceCanonicalRoot: null,
  }
  let verifiedRuntime: VerifiedRuntime = {
    runtimeRoot:
      '/Users/student/Library/Application Support/AY-PLE/runtime-cache/v1/runtime',
    identity: {
      releaseId: '0.1.0',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
      nativeCodexVersion: '0.144.4',
      pythonVersion: '3.10.18',
      sourceCommit: '8'.repeat(40),
      patchStackSha256: 'f'.repeat(64),
    },
  }
  const serverApplication = {
    app: {} as never,
    semesterWorkspace: undefined,
    async close() {},
  } satisfies ServerApplication
  return {
    resources,
    roots,
    staticSite,
    serverApplication,
    get verifiedRuntime() {
      return verifiedRuntime
    },
    set verifiedRuntime(value: VerifiedRuntime) {
      verifiedRuntime = value
    },
    spawnResult: undefined as VerifiedRuntime | undefined,
    calls: {
      resolverBundle: 0,
      resolve: 0,
      server: 0,
      resolverInput: undefined as RuntimeResolverBundleInput | undefined,
      serverOptions: undefined as CreateServerAppOptions | undefined,
      spawnRuntime: undefined as VerifiedRuntime | undefined,
    },
  }
}

function successfulDependencies(
  fixture: ReturnType<typeof startupFixture>,
  journal: string[],
): ApplicationStartupDependencies {
  return {
    async verifyPackageResources() {
      journal.push('package')
      return fixture.resources
    },
    readApplicationUserRecord() {
      journal.push('user')
      return { homedir: '/Users/student', uid: 501 }
    },
    async runCompatibilityPreflight() {
      journal.push('compatibility')
      return compatibilityReady()
    },
    async createApplicationRoots() {
      journal.push('roots')
      return fixture.roots
    },
    createRuntimeResolverBundle(input) {
      journal.push('resolver-bundle')
      fixture.calls.resolverBundle += 1
      fixture.calls.resolverInput = input
      return {
        resolver: {
          async resolve({ report }) {
            journal.push('resolve')
            fixture.calls.resolve += 1
            report({ phase: 'ready' })
            return fixture.verifiedRuntime
          },
        },
        spawnBoundary: {
          async verifyForSpawn({ runtime }) {
            journal.push('spawn-reverify')
            fixture.calls.spawnRuntime = runtime
            return fixture.spawnResult ?? runtime
          },
        },
      }
    },
    async createServerApplication(options) {
      journal.push('server')
      fixture.calls.server += 1
      fixture.calls.serverOptions = options
      await options.publicPreview!.runtime.spawn.verifyRuntimeForSpawn({
        signal,
      })
      return fixture.serverApplication
    },
  }
}

function startupInput() {
  return {
    executableModuleUrl: new URL(
      'file:///Applications/AY-PLE/package/dist/cli.js',
    ),
    requiredApplicationCommand: 'npx ay-ple@0.1.0-preview.1',
    suggestedLeafName: '2026-1-semester',
    signal,
  } as const
}

function validOwner() {
  return {
    applicationInstanceNonce: 'a'.repeat(32),
    processStartIdentity: 'pid-123-start-456',
  }
}

function compatibilityReady(): CompatibilityPreflightReady {
  return {
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
        canonicalPath: '/Applications/Google Chrome.app',
      },
    },
  }
}

function compatibility() {
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
          system: '/Applications/Google Chrome.app',
          userHomeRelative: 'Applications/Google Chrome.app',
        },
        minimumMajor: 130,
      },
      {
        name: 'Chromium',
        bundleId: 'org.chromium.Chromium',
        candidateLocations: {
          system: '/Applications/Chromium.app',
          userHomeRelative: 'Applications/Chromium.app',
        },
        minimumMajor: 130,
      },
    ],
    workspaceBundle: {
      descriptorResource: 'resources/workspace-bundle.json',
      descriptorSha256: 'b'.repeat(64),
    },
  } as const
}

function runtimeDescriptor() {
  return {
    schemaVersion: 1,
    launcher: {
      packageName: 'ay-ple',
      version: '0.1.0-preview.1',
    },
    distribution: {
      repository: 'https://github.com/ay-ple/ay-ple',
      applicationReleaseTag: 'v0.1.0-preview.1',
      runtimeAssetReleaseTag: 'runtime-v0.1.0',
    },
    runtime: {
      releaseId: '0.1.0',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    archive: {
      format: 'ay-ple-runtime-tar-gzip-v1',
      assetName: 'ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
      url: 'https://github.com/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
      bytes: 1024,
      sha256: '9'.repeat(64),
    },
    manifest: {
      packageResource: 'resources/runtime/manifest.json',
      schemaVersion: 2,
      bytes: 3,
      sha256: 'e'.repeat(64),
    },
  } as const
}

function hasStartupCode(code: string) {
  return (error: unknown) =>
    error instanceof ApplicationStartupError &&
    error.failure.code === code
}
