import { randomUUID } from 'node:crypto'

import type {
  CodexFreshAccount,
} from '@ay-ple/codex-chat-runtime'
import {
  createLeaseBoundSemesterSetupJourney,
  createSetupEnvelopeStore,
  type ActiveReadyPointer,
  type AdmittedSemesterWorkspace,
  type LaunchBinding,
  type RecoverableSetupEnvelopeStore,
  type VerifiedBundleSource,
  type WorkspaceActionAdmissionResult,
} from '@ay-ple/semester-workspace'

import { createAccountRuntimeCoordinator } from './account-runtime/coordinator.js'
import {
  createAccountRuntimeRouteAdapter,
  type AccountRuntimeRouteAdapter,
} from './account-runtime/route-adapter.js'
import {
  createPublicPreviewCommandAdapter,
  type PublicPreviewCommandAdapter,
} from './public-preview-command-adapter.js'
import { createPublicPreviewRouter } from './public-preview-http.js'
import {
  createMacOsPublicPreviewParentPicker,
  createPublicPreviewParentSelectionPort,
  type PublicPreviewParentPicker,
} from './public-preview-parent-selection.js'
import {
  createPublicPreviewRuntimeOwner,
  type PublicPreviewExpectedRuntimeBinding,
  type PublicPreviewRuntimeBootstrap,
  type PublicPreviewRuntimeOwner,
} from './public-preview-runtime-owner.js'
import {
  createLeaseBoundReadyTransition,
} from './setup/lease-bound-ready-transition.js'
import {
  createReadyWorkspacePresenter,
} from './setup/ready-workspace-presentation.js'
import {
  createSetupEnvelopeActionReadiness,
} from './setup/setup-envelope-action-readiness.js'
import {
  createWorkspaceActionAdmission,
} from './setup/workspace-action-admission.js'

export type PublicPreviewSetupBootstrap = {
  readonly appDataRoot: string
  readonly bundleSource: VerifiedBundleSource
  readonly displayUserHome: string
  readonly release: LaunchBinding
  readonly requiredApplicationCommand: string
  readonly suggestedLeafName: string
  readonly pickParentDirectory?: PublicPreviewParentPicker
}

export type PublicPreviewServerBootstrap = {
  readonly applicationVersion: string
  readonly origin: string
  readonly runtime: PublicPreviewRuntimeBootstrap
  readonly setup: PublicPreviewSetupBootstrap
}

export class PublicPreviewCompositionStartError extends Error {
  readonly code = 'public_preview_runtime_cleanup_ambiguous'

  constructor() {
    super('Public preview Runtime cleanup was ambiguous')
    this.name = 'PublicPreviewCompositionStartError'
  }
}

export interface PublicPreviewFeatureComposition {
  readonly origin: string
  readonly adapter: PublicPreviewCommandAdapter
  readonly router: ReturnType<typeof createPublicPreviewRouter>
  /**
   * Future post-Ready action seam. This performs admission only; the public
   * preview graph does not mount or execute an academic action route.
   */
  admitAcademicAction(): Promise<WorkspaceActionAdmissionResult>
  beginShutdown(): void
  close(input: {
    readonly signal: AbortSignal
  }): Promise<
    | { readonly status: 'closed'; readonly processTreeGone: true }
    | { readonly status: 'ambiguous'; readonly processTreeGone: false }
  >
}

type PublicPreviewCompositionTesting = {
  readonly accountAttemptId?: () => string
  readonly createParentSelectionId?: () => string
  readonly createSetupId?: () => string
  readonly createRuntimeOwner?: typeof createPublicPreviewRuntimeOwner
  readonly now?: () => Date
  readonly runtimeOwner?: PublicPreviewRuntimeOwner
  readonly stateStore?: RecoverableSetupEnvelopeStore
  readonly wait?: (
    milliseconds: number,
    signal: AbortSignal,
  ) => Promise<void>
}

export async function createPublicPreviewFeatureComposition(
  input: PublicPreviewServerBootstrap,
  testing: PublicPreviewCompositionTesting = {},
): Promise<PublicPreviewFeatureComposition> {
  requireLocalOrigin(input.origin)
  const release = structuredClone(input.setup.release)
  const bundleSource = structuredClone(input.setup.bundleSource)
  requireCoherentReleaseBootstrap({
    applicationVersion: input.applicationVersion,
    bundleSource,
    release,
    requiredApplicationCommand:
      input.setup.requiredApplicationCommand,
  })
  const expectedRuntime: PublicPreviewExpectedRuntimeBinding = {
    applicationVersion: release.application.packageVersion,
    runtime: {
      releaseId: release.runtime.releaseId,
      target: release.runtime.target,
      runtimeContractVersion: release.runtime.runtimeContractVersion,
    },
  }
  const stateStore =
    testing.stateStore ??
    createSetupEnvelopeStore({
      appDataRoot: input.setup.appDataRoot,
    })
  const parentSelection = createPublicPreviewParentSelectionPort({
    pick:
      input.setup.pickParentDirectory ??
      createMacOsPublicPreviewParentPicker(),
    userHome: input.setup.displayUserHome,
    createSelectionId: testing.createParentSelectionId,
  })
  const presentReadyWorkspace = createReadyWorkspacePresenter({
    userHome: input.setup.displayUserHome,
  })
  const runtimeOwner =
    testing.runtimeOwner ??
    await (
      testing.createRuntimeOwner ??
      createPublicPreviewRuntimeOwner
    )(input.runtime, expectedRuntime)
  try {
    let accountAdapter: AccountRuntimeRouteAdapter | undefined
    const coordinator = createAccountRuntimeCoordinator<
      CodexFreshAccount,
      AdmittedSemesterWorkspace,
      ActiveReadyPointer
    >({
      closeAuthOnlyRuntime: (request) =>
        runtimeOwner.closeAuthOnly(request),
      startWorkspaceRuntime: (request) =>
        runtimeOwner.startWorkspace(request),
      readFreshWorkspaceAccount: (request) =>
        runtimeOwner.readFreshWorkspaceAccount(request),
      logoutAndReadFreshAccount: (request) =>
        runtimeOwner.logoutAndReadFreshAccount(request),
      closeCurrentRuntime: (request) =>
        runtimeOwner.closeCurrent(request),
      hasPendingAccountAttempt: () =>
        accountAdapter?.hasPendingAttempt() ?? false,
      sameWorkspace,
    })
    const transitionController = new AbortController()
    const readyTransition = createLeaseBoundReadyTransition({
      lease: coordinator,
      createNativeBoundary: (workspace) =>
        runtimeOwner.createNativeBoundary(workspace),
      transitionSignal: () => transitionController.signal,
    })
    accountAdapter = createAccountRuntimeRouteAdapter({
      coordinator,
      currentAccountRuntime: (request) =>
        runtimeOwner.current(request),
      attemptId:
        testing.accountAttemptId ??
        (() => `account_attempt_${randomUUID().replaceAll('-', '')}`),
      now: testing.now ?? (() => new Date()),
      wait: testing.wait ?? waitWithSignal,
      invalidateReadyAttestation: () =>
        readyTransition.attestation.invalidateAll(),
    })
    const journey = createLeaseBoundSemesterSetupJourney({
      stateStore,
      release,
      bundleSource,
      resolveParent: (selectionId) =>
        parentSelection.resolve(selectionId),
      createSetupId: testing.createSetupId,
      readyTransition,
    })
    await journey.reconcile({ kind: 'launch' })
    const readiness = createSetupEnvelopeActionReadiness({
      stateStore,
      release,
      transitionAttestation: readyTransition.attestation,
    })
    const isReadyAttested = (
      workspace: AdmittedSemesterWorkspace,
    ): boolean => {
      const attestation = readyTransition.attestation.read(workspace)
      return (
        attestation.state === 'confirmed' &&
        sameWorkspaceIdentity(attestation.ready.workspace, workspace)
      )
    }
    const adapter = createPublicPreviewCommandAdapter({
      account: accountAdapter,
      journey,
      parentSelection,
      projectionContext: {
        suggestedLeafName: input.setup.suggestedLeafName,
        requiredApplicationCommand:
          input.setup.requiredApplicationCommand,
        readyAttested: isReadyAttested,
        presentReadyWorkspace,
      },
    })
    let closePromise:
      | Promise<
          | { readonly status: 'closed'; readonly processTreeGone: true }
          | { readonly status: 'ambiguous'; readonly processTreeGone: false }
        >
      | undefined
    let shuttingDown = false

    const beginShutdown = () => {
      if (shuttingDown) return
      shuttingDown = true
      transitionController.abort()
      adapter.beginShutdown()
    }

    return {
      origin: input.origin,
      adapter,
      router: createPublicPreviewRouter({
        adapter,
        origin: input.origin,
      }),
      async admitAcademicAction() {
        const workspace = adapter.currentReadyWorkspace()
        if (!workspace) {
          return { status: 'blocked', reason: 'workspace_not_ready' }
        }
        let nativeBoundary
        try {
          nativeBoundary = runtimeOwner.createNativeBoundary(workspace)
        } catch {
          return { status: 'blocked', reason: 'context_not_verified' }
        }
        return createWorkspaceActionAdmission({
          source: bundleSource,
          readiness,
          nativeBoundary,
        }).admit({ workspace, action: 'academic' })
      },
      beginShutdown,
      close({ signal }) {
        if (closePromise) return closePromise
        beginShutdown()
        closePromise = (async () => {
          await adapter.whenIdle()
          return coordinator.close({ signal })
        })()
        return closePromise
      },
    }
  } catch (error) {
    await requireRuntimeRollback(runtimeOwner)
    throw error
  }
}

async function requireRuntimeRollback(
  runtimeOwner: PublicPreviewRuntimeOwner,
): Promise<void> {
  let result
  try {
    result = await runtimeOwner.closeCurrent({
      signal: new AbortController().signal,
    })
  } catch {
    throw new PublicPreviewCompositionStartError()
  }
  if (result.status !== 'closed' || !result.processTreeGone) {
    throw new PublicPreviewCompositionStartError()
  }
}

function requireCoherentReleaseBootstrap(input: {
  readonly applicationVersion: string
  readonly bundleSource: VerifiedBundleSource
  readonly release: LaunchBinding
  readonly requiredApplicationCommand: string
}): void {
  const { release, bundleSource } = input
  if (
    release.application.packageName !== 'ay-ple' ||
    !isOpaqueValue(input.applicationVersion) ||
    !isOpaqueValue(release.application.packageVersion) ||
    input.applicationVersion !== release.application.packageVersion ||
    input.requiredApplicationCommand !==
      `npx ay-ple@${release.application.packageVersion}` ||
    !isOpaqueValue(release.runtime.releaseId) ||
    release.runtime.target !== 'darwin-arm64' ||
    !Number.isSafeInteger(release.runtime.runtimeContractVersion) ||
    release.runtime.runtimeContractVersion < 1 ||
    !isSha256(release.runtime.releaseDescriptorSha256) ||
    !isSha256(release.runtime.manifestSha256) ||
    !isSha256(release.bundle.descriptorSha256) ||
    !isSha256(release.bundle.completeTreeSha256) ||
    !isSha256(bundleSource.descriptorSha256) ||
    !isSha256(bundleSource.completeTreeSha256) ||
    release.bundle.descriptorSha256 !==
      bundleSource.descriptorSha256 ||
    release.bundle.completeTreeSha256 !==
      bundleSource.completeTreeSha256 ||
    bundleSource.descriptor.completeTreeSha256 !==
      bundleSource.completeTreeSha256
  ) {
    throw new TypeError('Public preview release bootstrap is inconsistent')
  }
}

function sameWorkspace(
  left: AdmittedSemesterWorkspace,
  right: AdmittedSemesterWorkspace,
): boolean {
  return sameWorkspaceIdentity(left, right)
}

function sameWorkspaceIdentity(
  left: { readonly canonicalRoot: string; readonly workspaceId: string },
  right: { readonly canonicalRoot: string; readonly workspaceId: string },
): boolean {
  return left.canonicalRoot === right.canonicalRoot &&
    left.workspaceId === right.workspaceId
}

function requireLocalOrigin(origin: string): void {
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    throw new TypeError('A canonical local Origin is required')
  }
  if (
    parsed.protocol !== 'http:' ||
    parsed.hostname !== '127.0.0.1' ||
    parsed.port.length === 0 ||
    parsed.pathname !== '/' ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0 ||
    parsed.origin !== origin
  ) {
    throw new TypeError('A canonical local Origin is required')
  }
}

function isOpaqueValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= 512 &&
    !/[\u0000-\u001f\u007f/\\]/u.test(value)
  )
}

function isSha256(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{64}$/u.test(value)
  )
}

function waitWithSignal(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise((resolve, reject) => {
    const release = () => signal.removeEventListener('abort', abort)
    const timer = setTimeout(() => {
      release()
      resolve()
    }, milliseconds)
    const abort = () => {
      clearTimeout(timer)
      release()
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, { once: true })
    void Promise.resolve().then(() => {
      if (!signal.aborted) return
      abort()
    })
  })
}
