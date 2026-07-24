import path from 'node:path'

import {
  RuntimeReleaseAuthorityError,
  createRuntimeResolverBundle,
  type RuntimeResolutionError,
  type RuntimeResolutionErrorCode,
  type RuntimeResolveProgress,
  type RuntimeResolverBundleInput,
  type VerifiedRuntime,
} from '@ay-ple/runtime-release'
import type {
  AdmittedSemesterWorkspace,
  LaunchBinding,
} from '@ay-ple/semester-workspace'
import {
  ServerStartupCleanupError,
  createServerApplication,
  type CreateServerAppOptions,
  type ServerApplication,
} from '@ay-ple/server'

import {
  ApplicationRootsError,
  createApplicationRootsForUser,
  createPublicPreviewWorkspaceTargetGuard,
  readApplicationUserRecord,
  type ApplicationUserRecord,
  type PreparedApplicationRoots,
} from './application-roots.js'
import {
  runCompatibilityPreflight,
  type CompatibilityPreflightBlocked,
  type CompatibilityPreflightReady,
  type CompatibilityPreflightResult,
} from './compatibility-preflight.js'
import type {
  ApplicationPreflightFailureCode,
  DynamicLocalOrigin,
} from './host-contract.js'
import {
  verifyPackageResources,
  type VerifiedPackageResources,
  type VerifiedStaticSite,
} from './package-resources.js'

export type ApplicationRuntimeOwner = {
  readonly applicationInstanceNonce: string
  readonly processStartIdentity: string
}

export type ApplicationStartupFailureCode =
  | ApplicationPreflightFailureCode
  | RuntimeResolutionErrorCode
  | 'application_configuration_invalid'
  | 'application_startup_failed'

export type ApplicationStartupFailure = {
  readonly code: ApplicationStartupFailureCode
  readonly retryable: boolean
  readonly remediation: string
  readonly found?: string
  readonly supported?: string
}

export class ApplicationStartupError extends Error {
  readonly #failure: ApplicationStartupFailure

  constructor(failure: ApplicationStartupFailure) {
    const safeFailure = freezeStartupFailure(failure)
    super(safeFailure.remediation)
    this.name = 'ApplicationStartupError'
    this.#failure = safeFailure
  }

  get failure(): ApplicationStartupFailure {
    return this.#failure
  }
}

export type ApplicationStartupInput = {
  readonly executableModuleUrl: string | URL
  readonly requiredApplicationCommand: string
  readonly suggestedLeafName: string
  readonly admittedWorkspace?: AdmittedSemesterWorkspace | null
  readonly signal: AbortSignal
}

export type PrepareApplicationStartupInput = {
  readonly owner: ApplicationRuntimeOwner
  readonly signal: AbortSignal
  readonly report: (progress: RuntimeResolveProgress) => void
}

export type PreparedApplicationStartup = {
  /**
   * The exact D1 capability-bearing object is retained until every spawn
   * revalidation. It must never be cloned or reconstructed.
   */
  readonly runtime: VerifiedRuntime
  createServerAtOrigin(
    origin: DynamicLocalOrigin | string,
  ): Promise<ServerApplication>
}

export type ApplicationStartupAdmission = {
  readonly applicationVersion: string
  readonly appDataRoot: string
  readonly preflight: {
    readonly compatibilityDescriptorSha256: string
    readonly discovered: CompatibilityPreflightReady['discovered']
  }
  readonly staticSite: VerifiedStaticSite
  prepare(
    input: PrepareApplicationStartupInput,
  ): Promise<PreparedApplicationStartup>
}

type RuntimeResolverBundle = ReturnType<
  typeof createRuntimeResolverBundle
>

export type ApplicationStartupDependencies = {
  readonly verifyPackageResources: typeof verifyPackageResources
  readonly readApplicationUserRecord: typeof readApplicationUserRecord
  readonly runCompatibilityPreflight: typeof runCompatibilityPreflight
  readonly createApplicationRoots: (
    input: {
      readonly packageRoot: string
      readonly admittedWorkspace?: AdmittedSemesterWorkspace | null
    },
    user: ApplicationUserRecord,
  ) => Promise<PreparedApplicationRoots>
  readonly createRuntimeResolverBundle: (
    input: RuntimeResolverBundleInput,
  ) => RuntimeResolverBundle
  readonly createServerApplication: (
    options: CreateServerAppOptions,
  ) => Promise<ServerApplication>
}

const productionDependencies: ApplicationStartupDependencies =
  Object.freeze({
    verifyPackageResources,
    readApplicationUserRecord,
    runCompatibilityPreflight,
    createApplicationRoots: createApplicationRootsForUser,
    createRuntimeResolverBundle,
    createServerApplication,
  })

export function admitApplicationStartup(
  input: ApplicationStartupInput,
): Promise<ApplicationStartupAdmission> {
  return admitApplicationStartupForTesting(
    input,
    productionDependencies,
  )
}

/**
 * Source-internal orchestration seam. Production imports expose only the
 * staged startup Module, never effect replacements or raw discovery probes.
 */
export async function admitApplicationStartupForTesting(
  input: ApplicationStartupInput,
  dependencies: ApplicationStartupDependencies,
): Promise<ApplicationStartupAdmission> {
  const snapshot = snapshotStartupInput(input)
  requireNotCancelled(snapshot.signal)

  let resources: VerifiedPackageResources
  try {
    resources = await dependencies.verifyPackageResources({
      executableModuleUrl: snapshot.executableModuleUrl,
    })
  } catch (error) {
    if (error instanceof ApplicationStartupError) throw error
    throw startupError(
      'package_integrity_failed',
      false,
      'AY-PLE package를 다시 설치한 뒤 실행하세요.',
    )
  }
  requireNotCancelled(snapshot.signal)
  requireApplicationConfiguration(snapshot, resources)

  let user: ApplicationUserRecord
  try {
    user = snapshotApplicationUser(
      dependencies.readApplicationUserRecord(),
    )
  } catch {
    throw startupError(
      'unsafe_app_data_root',
      false,
      '현재 macOS user account의 home directory를 확인하세요.',
    )
  }
  requireNotCancelled(snapshot.signal)

  let compatibility: CompatibilityPreflightResult
  try {
    compatibility = await dependencies.runCompatibilityPreflight({
      descriptor: resources.compatibility,
      userHome: user.homedir,
      signal: snapshot.signal,
    })
  } catch {
    requireNotCancelled(snapshot.signal)
    throw startupError(
      'application_startup_failed',
      true,
      '지원 환경을 확인한 뒤 AY-PLE을 다시 실행하세요.',
    )
  }
  requireNotCancelled(snapshot.signal)
  if (compatibility.status === 'blocked') {
    throw compatibilityError(compatibility)
  }

  let roots: PreparedApplicationRoots
  try {
    roots = await dependencies.createApplicationRoots(
      {
        packageRoot: resources.packageRoot,
        admittedWorkspace: snapshot.admittedWorkspace,
      },
      user,
    )
  } catch (error) {
    if (error instanceof ApplicationRootsError) {
      throw startupError(
        error.code,
        false,
        rootRemediation(error.code),
      )
    }
    throw startupError(
      'unsafe_app_data_root',
      false,
      'AY-PLE application data 위치와 권한을 확인하세요.',
    )
  }
  requireNotCancelled(snapshot.signal)

  return createStartupAdmission({
    compatibility,
    dependencies,
    resources,
    roots,
    startup: snapshot,
  })
}

function createStartupAdmission(context: {
  readonly compatibility: CompatibilityPreflightReady
  readonly dependencies: ApplicationStartupDependencies
  readonly resources: VerifiedPackageResources
  readonly roots: PreparedApplicationRoots
  readonly startup: StartupInputSnapshot
}): ApplicationStartupAdmission {
  const {
    compatibility,
    dependencies,
    resources,
    roots,
    startup,
  } = context
  let resolverOwner: ApplicationRuntimeOwner | undefined
  let resolverBundle: RuntimeResolverBundle | undefined
  let preparedPromise:
    | Promise<PreparedApplicationStartup>
    | undefined

  const prepare = async (
    input: PrepareApplicationStartupInput,
  ): Promise<PreparedApplicationStartup> => {
    const owner = snapshotRuntimeOwner(input.owner)
    const signal = input.signal
    const report = input.report
    if (typeof report !== 'function') {
      throw startupError(
        'application_configuration_invalid',
        false,
        'AY-PLE startup 구성을 다시 확인하세요.',
      )
    }
    requireSignalsActive(startup.signal, signal)
    if (
      resolverOwner !== undefined &&
      !sameRuntimeOwner(resolverOwner, owner)
    ) {
      throw startupError(
        'application_configuration_invalid',
        false,
        'AY-PLE startup instance를 새로 실행하세요.',
      )
    }
    if (preparedPromise !== undefined) return preparedPromise

    resolverOwner ??= owner
    try {
      resolverBundle ??=
        dependencies.createRuntimeResolverBundle(
          createResolverInput(resources, owner),
        )
    } catch (error) {
      throw mapRuntimeFailure(error)
    }

    const activeBundle = resolverBundle
    const attempt = prepareRuntime({
      bundle: activeBundle,
      dependencies,
      report,
      resources,
      roots,
      signal,
      startup,
    })
    preparedPromise = attempt
    void attempt.catch(() => {
      if (preparedPromise === attempt) {
        preparedPromise = undefined
      }
    })
    return attempt
  }

  return Object.freeze({
    applicationVersion: resources.compatibility.application.version,
    appDataRoot: roots.appDataRoot,
    preflight: freezePreflightIdentity(
      resources.compatibilityDescriptorSha256,
      compatibility,
    ),
    staticSite: resources.staticSite,
    prepare,
  })
}

async function prepareRuntime(input: {
  readonly bundle: RuntimeResolverBundle
  readonly dependencies: ApplicationStartupDependencies
  readonly report: (progress: RuntimeResolveProgress) => void
  readonly resources: VerifiedPackageResources
  readonly roots: PreparedApplicationRoots
  readonly signal: AbortSignal
  readonly startup: StartupInputSnapshot
}): Promise<PreparedApplicationStartup> {
  const lifetimeSignal = combineSignals(
    input.startup.signal,
    input.signal,
  )
  let runtime: VerifiedRuntime
  try {
    runtime = await input.bundle.resolver.resolve({
      appDataRoot: input.roots.appDataRoot,
      signal: lifetimeSignal,
      report: input.report,
    })
  } catch (error) {
    throw mapRuntimeFailure(error)
  }
  requireNotCancelled(lifetimeSignal)
  requireRuntimeIdentity(runtime, input.resources)

  return createPreparedStartup({
    ...input,
    lifetimeSignal,
    runtime,
  })
}

function createPreparedStartup(input: {
  readonly bundle: RuntimeResolverBundle
  readonly dependencies: ApplicationStartupDependencies
  readonly lifetimeSignal: AbortSignal
  readonly resources: VerifiedPackageResources
  readonly roots: PreparedApplicationRoots
  readonly runtime: VerifiedRuntime
  readonly startup: StartupInputSnapshot
}): PreparedApplicationStartup {
  let boundOrigin: DynamicLocalOrigin | undefined
  let serverPromise: Promise<ServerApplication> | undefined

  const createServerAtOrigin = async (
    originInput: DynamicLocalOrigin | string,
  ): Promise<ServerApplication> => {
    const origin = requireDynamicLocalOrigin(originInput)
    if (boundOrigin !== undefined && boundOrigin !== origin) {
      throw startupError(
        'application_configuration_invalid',
        false,
        'AY-PLE local Server를 새로 실행하세요.',
      )
    }
    if (serverPromise !== undefined) return serverPromise
    requireNotCancelled(input.lifetimeSignal)
    boundOrigin ??= origin

    const attempt = createBoundServer({
      ...input,
      origin,
    })
    serverPromise = attempt
    // Once C construction begins this Prepared capability is terminal, even
    // on failure: an ambiguous auth Runtime must never be followed by a
    // second construction attempt in the same process.
    void attempt.catch(() => {})
    return attempt
  }

  return Object.freeze({
    runtime: input.runtime,
    createServerAtOrigin,
  })
}

async function createBoundServer(input: {
  readonly bundle: RuntimeResolverBundle
  readonly dependencies: ApplicationStartupDependencies
  readonly lifetimeSignal: AbortSignal
  readonly origin: DynamicLocalOrigin
  readonly resources: VerifiedPackageResources
  readonly roots: PreparedApplicationRoots
  readonly runtime: VerifiedRuntime
  readonly startup: StartupInputSnapshot
}): Promise<ServerApplication> {
  const release = createLaunchBinding(input.resources)
  const guardWorkspaceTarget =
    createPublicPreviewWorkspaceTargetGuard(input.roots)
  try {
    const application =
      await input.dependencies.createServerApplication({
        publicPreview: {
          applicationVersion:
            input.resources.compatibility.application.version,
          origin: input.origin,
          runtime: {
            authOnlyBootstrapCwd:
              input.roots.controlled.authOnlyBootstrapCwd,
            environment: {
              home: input.roots.controlled.home,
              codexHome: input.roots.controlled.codexHome,
              codexSqliteHome:
                input.roots.controlled.codexSqliteHome,
              tempDirectory:
                input.roots.controlled.tempDirectory,
            },
            spawn: {
              verifyRuntimeForSpawn: ({ signal }) =>
                verifyRuntimeForServerSpawn({
                  bundle: input.bundle,
                  lifetimeSignal: input.lifetimeSignal,
                  release,
                  runtime: input.runtime,
                  signal,
                }),
            },
          },
          setup: {
            appDataRoot: input.roots.appDataRoot,
            bundleSource: input.resources.workspace.source,
            displayUserHome: input.roots.userHome,
            guardWorkspaceTarget,
            release,
            requiredApplicationCommand:
              input.startup.requiredApplicationCommand,
            suggestedLeafName: input.startup.suggestedLeafName,
          },
        },
      })
    try {
      requireNotCancelled(input.lifetimeSignal)
    } catch (error) {
      try {
        await application.close()
      } catch (cleanupError) {
        if (cleanupError instanceof ServerStartupCleanupError) {
          throw cleanupError
        }
        throw startupError(
          'application_startup_failed',
          false,
          'AY-PLE process를 완전히 종료한 뒤 다시 실행하세요.',
        )
      }
      throw error
    }
    return application
  } catch (error) {
    if (error instanceof ApplicationStartupError) throw error
    if (error instanceof ServerStartupCleanupError) throw error
    if (error instanceof RuntimeReleaseAuthorityError) {
      throw mapRuntimeFailure(error)
    }
    throw startupError(
      'application_startup_failed',
      true,
      'AY-PLE local Server를 닫고 다시 실행하세요.',
    )
  }
}

async function verifyRuntimeForServerSpawn(input: {
  readonly bundle: RuntimeResolverBundle
  readonly lifetimeSignal: AbortSignal
  readonly release: LaunchBinding
  readonly runtime: VerifiedRuntime
  readonly signal: AbortSignal
}): Promise<{
  readonly runtimeRoot: string
  readonly identity: LaunchBinding['runtime']
}> {
  const spawnSignal = combineSignals(
    input.lifetimeSignal,
    input.signal,
  )
  let verified: VerifiedRuntime
  try {
    verified = await input.bundle.spawnBoundary.verifyForSpawn({
      runtime: input.runtime,
      signal: spawnSignal,
    })
  } catch (error) {
    throw mapRuntimeFailure(error)
  }
  requireNotCancelled(spawnSignal)
  if (verified !== input.runtime) {
    throw startupError(
      'runtime_incompatible',
      false,
      '검증된 AY-PLE Runtime을 다시 준비하세요.',
    )
  }
  requireMatchingRuntimeIdentity(
    verified,
    input.release.runtime,
  )
  return Object.freeze({
    runtimeRoot: verified.runtimeRoot,
    identity: input.release.runtime,
  })
}

function createResolverInput(
  resources: VerifiedPackageResources,
  owner: ApplicationRuntimeOwner,
): RuntimeResolverBundleInput {
  const descriptor = resources.runtime.descriptor
  return {
    application: {
      packageName: resources.compatibility.application.packageName,
      version: resources.compatibility.application.version,
    },
    canonicalManifestBytes:
      resources.runtime.canonicalManifestBytes,
    canonicalManifestResource:
      resources.runtime.canonicalManifestResource,
    descriptor,
    owner,
    runtimeContractVersion:
      descriptor.runtime.runtimeContractVersion,
    target: descriptor.runtime.target,
  }
}

function createLaunchBinding(
  resources: VerifiedPackageResources,
): LaunchBinding {
  const descriptor = resources.runtime.descriptor
  return Object.freeze({
    application: Object.freeze({
      packageName: 'ay-ple' as const,
      packageVersion:
        resources.compatibility.application.version,
    }),
    runtime: Object.freeze({
      releaseDescriptorSha256:
        resources.runtime.releaseDescriptorSha256,
      manifestSha256: descriptor.manifest.sha256,
      releaseId: descriptor.runtime.releaseId,
      target: descriptor.runtime.target,
      runtimeContractVersion:
        descriptor.runtime.runtimeContractVersion,
    }),
    bundle: Object.freeze({
      descriptorSha256:
        resources.workspace.source.descriptorSha256,
      completeTreeSha256:
        resources.workspace.source.completeTreeSha256,
    }),
  })
}

function requireRuntimeIdentity(
  runtime: VerifiedRuntime,
  resources: VerifiedPackageResources,
): void {
  const expected = resources.runtime.descriptor.runtime
  if (
    runtime.identity.releaseId !== expected.releaseId ||
    runtime.identity.target !== expected.target ||
    runtime.identity.runtimeContractVersion !==
      expected.runtimeContractVersion ||
    !isSafeAbsolutePath(runtime.runtimeRoot)
  ) {
    throw startupError(
      'runtime_incompatible',
      false,
      '검증된 AY-PLE Runtime을 다시 준비하세요.',
    )
  }
}

function requireMatchingRuntimeIdentity(
  runtime: VerifiedRuntime,
  expected: LaunchBinding['runtime'],
): void {
  if (
    runtime.identity.releaseId !== expected.releaseId ||
    runtime.identity.target !== expected.target ||
    runtime.identity.runtimeContractVersion !==
      expected.runtimeContractVersion ||
    !isSafeAbsolutePath(runtime.runtimeRoot)
  ) {
    throw startupError(
      'runtime_incompatible',
      false,
      '검증된 AY-PLE Runtime을 다시 준비하세요.',
    )
  }
}

type StartupInputSnapshot = {
  readonly executableModuleUrl: string
  readonly requiredApplicationCommand: string
  readonly suggestedLeafName: string
  readonly admittedWorkspace: AdmittedSemesterWorkspace | null
  readonly signal: AbortSignal
}

function snapshotStartupInput(
  input: ApplicationStartupInput,
): StartupInputSnapshot {
  const executableModuleUrl =
    input.executableModuleUrl instanceof URL
      ? input.executableModuleUrl.href
      : input.executableModuleUrl
  return Object.freeze({
    executableModuleUrl,
    requiredApplicationCommand:
      input.requiredApplicationCommand,
    suggestedLeafName: input.suggestedLeafName,
    admittedWorkspace: input.admittedWorkspace ?? null,
    signal: input.signal,
  })
}

function requireApplicationConfiguration(
  input: StartupInputSnapshot,
  resources: VerifiedPackageResources,
): void {
  const version = resources.compatibility.application.version
  if (
    input.requiredApplicationCommand !==
      `npx ay-ple@${version}` ||
    !isOpaqueValue(input.suggestedLeafName)
  ) {
    throw startupError(
      'application_configuration_invalid',
      false,
      'AY-PLE package의 startup 구성을 다시 확인하세요.',
    )
  }
}

function snapshotRuntimeOwner(
  input: ApplicationRuntimeOwner,
): ApplicationRuntimeOwner {
  const owner = Object.freeze({
    applicationInstanceNonce:
      input.applicationInstanceNonce,
    processStartIdentity: input.processStartIdentity,
  })
  if (
    !/^[0-9a-f]{32}$/u.test(
      owner.applicationInstanceNonce,
    ) ||
    !/^[\u0021-\u007e]{1,256}$/u.test(
      owner.processStartIdentity,
    )
  ) {
    throw startupError(
      'application_configuration_invalid',
      false,
      'AY-PLE startup instance를 새로 실행하세요.',
    )
  }
  return owner
}

function snapshotApplicationUser(
  input: ApplicationUserRecord,
): ApplicationUserRecord {
  const homedir = input.homedir
  const uid = input.uid
  if (
    typeof homedir !== 'string' ||
    !path.isAbsolute(homedir) ||
    path.normalize(homedir) !== homedir ||
    Buffer.byteLength(homedir, 'utf8') > 4096 ||
    /[\u0000-\u001f\u007f]/u.test(homedir) ||
    !Number.isSafeInteger(uid) ||
    uid < 0
  ) {
    throw startupError(
      'unsafe_app_data_root',
      false,
      '현재 macOS user account의 home directory를 확인하세요.',
    )
  }
  return Object.freeze({ homedir, uid })
}

function sameRuntimeOwner(
  left: ApplicationRuntimeOwner,
  right: ApplicationRuntimeOwner,
): boolean {
  return (
    left.applicationInstanceNonce ===
      right.applicationInstanceNonce &&
    left.processStartIdentity === right.processStartIdentity
  )
}

function requireDynamicLocalOrigin(
  value: string,
): DynamicLocalOrigin {
  if (
    typeof value !== 'string' ||
    !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/u.test(value)
  ) {
    throw startupError(
      'application_configuration_invalid',
      false,
      'AY-PLE local Server Origin을 다시 확인하세요.',
    )
  }
  const port = Number(value.slice(value.lastIndexOf(':') + 1))
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw startupError(
      'application_configuration_invalid',
      false,
      'AY-PLE local Server Origin을 다시 확인하세요.',
    )
  }
  if (
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65535 ||
    parsed.port.length === 0 ||
    parsed.origin !== value
  ) {
    throw startupError(
      'application_configuration_invalid',
      false,
      'AY-PLE local Server Origin을 다시 확인하세요.',
    )
  }
  return value as DynamicLocalOrigin
}

function requireNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw startupError(
      'runtime_cancelled',
      true,
      'AY-PLE을 다시 실행하세요.',
    )
  }
}

function requireSignalsActive(
  ...signals: readonly AbortSignal[]
): void {
  for (const signal of signals) requireNotCancelled(signal)
}

function combineSignals(
  ...signals: readonly AbortSignal[]
): AbortSignal {
  requireSignalsActive(...signals)
  return signals.length === 1
    ? signals[0]!
    : AbortSignal.any([...signals])
}

function mapRuntimeFailure(error: unknown): ApplicationStartupError {
  if (error instanceof ApplicationStartupError) return error
  if (error instanceof RuntimeReleaseAuthorityError) {
    const failure: RuntimeResolutionError = error.failure
    return new ApplicationStartupError({
      code: failure.code,
      retryable: failure.retryable,
      remediation: failure.remediation,
    })
  }
  return startupError(
    'runtime_recovery_required',
    true,
    'AY-PLE Runtime을 다시 준비하세요.',
  )
}

function compatibilityError(
  failure: CompatibilityPreflightBlocked,
): ApplicationStartupError {
  return new ApplicationStartupError({
    code: failure.code,
    retryable: false,
    remediation: failure.remediation,
    found: failure.found,
    supported: failure.supported,
  })
}

function rootRemediation(
  code: ApplicationRootsError['code'],
): string {
  if (code === 'unsafe_package_root') {
    return 'AY-PLE package를 다시 설치하세요.'
  }
  if (code === 'overlapping_roots') {
    return 'AY-PLE package, app data, workspace 위치를 분리하세요.'
  }
  return 'AY-PLE application data 위치와 권한을 확인하세요.'
}

function startupError(
  code: ApplicationStartupFailureCode,
  retryable: boolean,
  remediation: string,
): ApplicationStartupError {
  return new ApplicationStartupError({
    code,
    retryable,
    remediation,
  })
}

function freezeStartupFailure(
  input: ApplicationStartupFailure,
): ApplicationStartupFailure {
  const failure: ApplicationStartupFailure = {
    code: input.code,
    retryable: input.retryable,
    remediation: input.remediation,
    ...(input.found === undefined
      ? {}
      : { found: input.found }),
    ...(input.supported === undefined
      ? {}
      : { supported: input.supported }),
  }
  return Object.freeze(failure)
}

function freezePreflightIdentity(
  compatibilityDescriptorSha256: string,
  preflight: CompatibilityPreflightReady,
): ApplicationStartupAdmission['preflight'] {
  const browser = Object.freeze({
    name: preflight.discovered.browser.name,
    bundleId: preflight.discovered.browser.bundleId,
    version: preflight.discovered.browser.version,
    canonicalPath:
      preflight.discovered.browser.canonicalPath,
  })
  const discovered = Object.freeze({
    os: preflight.discovered.os,
    arch: preflight.discovered.arch,
    macosVersion: preflight.discovered.macosVersion,
    nodeVersion: preflight.discovered.nodeVersion,
    npmVersion: preflight.discovered.npmVersion,
    browser,
  })
  return Object.freeze({
    compatibilityDescriptorSha256,
    discovered,
  })
}

function isOpaqueValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= 512 &&
    !/[\u0000-\u001f\u007f/\\]/u.test(value)
  )
}

function isSafeAbsolutePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    path.isAbsolute(value) &&
    path.normalize(value) === value &&
    Buffer.byteLength(value, 'utf8') <= 4096 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  )
}
