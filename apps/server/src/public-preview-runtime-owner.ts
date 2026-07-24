import {
  createCodexChatRuntime,
  type CodexFreshAccount,
  type CodexManagedRuntime,
  type CodexRuntimeApplicationIdentity,
  type CodexRuntimeCloseResult,
  type CodexRuntimeRole,
} from '@ay-ple/codex-chat-runtime'
import type {
  AdmittedSemesterWorkspace,
} from '@ay-ple/semester-workspace'

import {
  createWorkspaceNativeProjectBoundary,
  type WorkspaceNativeProjectBoundary,
} from './setup/native-project-boundary.js'

export type PublicPreviewRuntimeEnvironment = {
  readonly home: string
  readonly codexHome: string
  readonly codexSqliteHome: string
  readonly tempDirectory: string
}

export type PublicPreviewRuntimeSpawnCapability = {
  verifyRuntimeForSpawn(input: {
    readonly signal: AbortSignal
  }): Promise<{
    readonly runtimeRoot: string
    readonly identity: {
      readonly releaseId: string
      readonly target: 'darwin-arm64'
      readonly runtimeContractVersion: number
    }
  }>
}

export type PublicPreviewRuntimeBootstrap = {
  readonly authOnlyBootstrapCwd: string
  readonly environment: PublicPreviewRuntimeEnvironment
  readonly spawn: PublicPreviewRuntimeSpawnCapability
}

export type PublicPreviewExpectedRuntimeBinding = {
  readonly applicationVersion: string
  readonly runtime: {
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
  }
}

export interface PublicPreviewRuntimeOwner {
  current(input: {
    readonly signal: AbortSignal
  }): Promise<CodexManagedRuntime>
  closeAuthOnly(input: {
    readonly signal: AbortSignal
  }): Promise<CodexRuntimeCloseResult>
  startWorkspace(input: {
    readonly workspace: AdmittedSemesterWorkspace
    readonly signal: AbortSignal
  }): Promise<void>
  readFreshWorkspaceAccount(input: {
    readonly signal: AbortSignal
  }): Promise<CodexFreshAccount>
  logoutAndReadFreshAccount(input: {
    readonly signal: AbortSignal
  }): Promise<CodexFreshAccount>
  closeCurrent(input: {
    readonly signal: AbortSignal
  }): Promise<CodexRuntimeCloseResult>
  createNativeBoundary(
    workspace: AdmittedSemesterWorkspace,
  ): WorkspaceNativeProjectBoundary
}

type ManagedRuntimeFactory = (input: {
  readonly runtimeRoot: string
  readonly role: CodexRuntimeRole
  readonly application: CodexRuntimeApplicationIdentity
  readonly environment: PublicPreviewRuntimeEnvironment
}) => Promise<CodexManagedRuntime>

export async function createPublicPreviewRuntimeOwner(
  input: PublicPreviewRuntimeBootstrap,
  expectedBinding: PublicPreviewExpectedRuntimeBinding,
  createRuntime: ManagedRuntimeFactory = createCodexChatRuntime,
): Promise<PublicPreviewRuntimeOwner> {
  const expected = cloneExpectedBinding(expectedBinding)
  const application = {
    name: 'ay-ple',
    title: 'AY-PLE',
    version: expected.applicationVersion,
  } as const satisfies CodexRuntimeApplicationIdentity
  const environment = { ...input.environment }
  let current: CodexManagedRuntime | undefined = await spawnRuntime({
    role: {
      role: 'auth-only',
      bootstrapCwd: input.authOnlyBootstrapCwd,
    },
    signal: new AbortController().signal,
  })
  if (
    current.role.role !== 'auth-only' ||
    current.role.bootstrapCwd !== input.authOnlyBootstrapCwd
  ) {
    await current.close({
      signal: new AbortController().signal,
    }).catch(() => undefined)
    throw new Error('The auth-only Runtime role changed')
  }
  let workspace: AdmittedSemesterWorkspace | undefined

  async function spawnRuntime(spawnInput: {
    readonly role: CodexRuntimeRole
    readonly signal: AbortSignal
  }): Promise<CodexManagedRuntime> {
    const verified = await input.spawn.verifyRuntimeForSpawn({
      signal: spawnInput.signal,
    })
    if (
      spawnInput.signal.aborted ||
      typeof verified.runtimeRoot !== 'string' ||
      verified.runtimeRoot.length === 0 ||
      !sameRuntimeIdentity(verified.identity, expected.runtime)
    ) {
      throw new TypeError(
        'Verified Runtime spawn release was not authorized',
      )
    }
    return createRuntime({
      runtimeRoot: verified.runtimeRoot,
      role: spawnInput.role,
      application,
      environment,
    })
  }

  const requireCurrent = (): CodexManagedRuntime => {
    if (!current) throw new Error('The managed Runtime is not active')
    return current
  }

  return {
    async current({ signal }) {
      if (signal.aborted) {
        throw new Error('The managed Runtime request was cancelled')
      }
      return requireCurrent()
    },
    async closeAuthOnly({ signal }) {
      const runtime = requireCurrent()
      if (runtime.role.role !== 'auth-only') {
        return { status: 'ambiguous', processTreeGone: false }
      }
      const result = await runtime.close({ signal })
      if (result.status === 'closed' && result.processTreeGone) {
        current = undefined
      }
      return result
    },
    async startWorkspace({ workspace: nextWorkspace, signal }) {
      if (current) {
        throw new Error('A managed Runtime generation is still active')
      }
      const runtime = await spawnRuntime({
        role: {
          role: 'workspace',
          workspaceRoot: nextWorkspace.canonicalRoot,
        },
        signal,
      })
      if (
        runtime.role.role !== 'workspace' ||
        runtime.role.workspaceRoot !== nextWorkspace.canonicalRoot
      ) {
        await runtime.close({ signal }).catch(() => undefined)
        throw new Error('The workspace Runtime role changed')
      }
      current = runtime
      workspace = cloneWorkspace(nextWorkspace)
    },
    async readFreshWorkspaceAccount({ signal }) {
      const runtime = requireWorkspaceRuntime(workspace, requireCurrent())
      return readFreshAccount(runtime, signal)
    },
    async logoutAndReadFreshAccount({ signal }) {
      const runtime = requireCurrent()
      const logout = await runtime.logout({ signal })
      if (logout.status === 'error') throw new Error(logout.error.code)
      return readFreshAccount(runtime, signal)
    },
    async closeCurrent({ signal }) {
      if (!current) return { status: 'closed', processTreeGone: true }
      const result = await current.close({ signal })
      if (result.status === 'closed' && result.processTreeGone) {
        current = undefined
        workspace = undefined
      }
      return result
    },
    createNativeBoundary(requestedWorkspace) {
      const runtime = requireWorkspaceRuntime(workspace, requireCurrent())
      if (!sameWorkspace(requestedWorkspace, workspace!)) {
        throw new Error('The native boundary workspace changed')
      }
      return createWorkspaceNativeProjectBoundary({
        workspace: requestedWorkspace,
        controlledHome: environment.home,
        controlledCodexHome: environment.codexHome,
        nativeContext: runtime,
      })
    },
  }
}

async function readFreshAccount(
  runtime: CodexManagedRuntime,
  signal: AbortSignal,
): Promise<CodexFreshAccount> {
  const read = await runtime.readAccount({
    refreshToken: true,
    signal,
  })
  if (read.status === 'error') throw new Error(read.error.code)
  return read.account
}

function requireWorkspaceRuntime(
  workspace: AdmittedSemesterWorkspace | undefined,
  runtime: CodexManagedRuntime,
): CodexManagedRuntime {
  if (
    !workspace ||
    runtime.role.role !== 'workspace' ||
    runtime.role.workspaceRoot !== workspace.canonicalRoot
  ) {
    throw new Error('The workspace Runtime is not active')
  }
  return runtime
}

function sameWorkspace(
  left: AdmittedSemesterWorkspace,
  right: AdmittedSemesterWorkspace,
): boolean {
  return (
    left.canonicalRoot === right.canonicalRoot &&
    left.workspaceId === right.workspaceId
  )
}

function cloneWorkspace(
  workspace: AdmittedSemesterWorkspace,
): AdmittedSemesterWorkspace {
  return structuredClone(workspace)
}

function cloneExpectedBinding(
  binding: PublicPreviewExpectedRuntimeBinding,
): PublicPreviewExpectedRuntimeBinding {
  if (
    !isOpaqueValue(binding.applicationVersion) ||
    !isOpaqueValue(binding.runtime.releaseId) ||
    binding.runtime.target !== 'darwin-arm64' ||
    !Number.isSafeInteger(binding.runtime.runtimeContractVersion) ||
    binding.runtime.runtimeContractVersion < 1
  ) {
    throw new TypeError('Expected Runtime release binding is invalid')
  }
  return {
    applicationVersion: binding.applicationVersion,
    runtime: { ...binding.runtime },
  }
}

function sameRuntimeIdentity(
  actual: {
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
  },
  expected: PublicPreviewExpectedRuntimeBinding['runtime'],
): boolean {
  return (
    actual !== null &&
    typeof actual === 'object' &&
    actual.releaseId === expected.releaseId &&
    actual.target === expected.target &&
    actual.runtimeContractVersion === expected.runtimeContractVersion
  )
}

function isOpaqueValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= 512 &&
    !/[\u0000-\u001f\u007f/\\]/u.test(value)
  )
}
