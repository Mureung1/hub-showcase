import { lstat, realpath } from 'node:fs/promises'

import type {
  LaunchBinding,
  WorkspaceParentAuthority,
} from '../contract.js'
import { createSetupEnvelopeStore } from '../setup-envelope-store.js'
import {
  createSemesterSetupJourney,
  type SemesterSetupJourneyFaultPoint,
} from '../setup-journey.js'
import { captureCanonicalWorkspaceBundleSource } from '../workspace-bundle.js'

const [appDataRoot, configuredParent, faultPoint] = process.argv.slice(2)
if (!appDataRoot || !configuredParent || !faultPoint) {
  process.exitCode = 2
} else {
  await run(
    appDataRoot,
    configuredParent,
    faultPoint as SemesterSetupJourneyFaultPoint,
  )
  process.exitCode = 3
}

async function run(
  appDataRoot: string,
  configuredParent: string,
  faultPoint: SemesterSetupJourneyFaultPoint,
): Promise<void> {
  const canonicalParent = await realpath(configuredParent)
  const stats = await lstat(canonicalParent, { bigint: true })
  const authority: WorkspaceParentAuthority = {
    selectionId: 'parent_selection_crash_worker',
    canonicalParent,
    parentDevice: stats.dev.toString(),
    parentInode: stats.ino.toString(),
  }
  const source = await captureCanonicalWorkspaceBundleSource()
  const release: LaunchBinding = {
    application: {
      packageName: 'ay-ple',
      packageVersion: '0.0.1',
    },
    runtime: {
      releaseDescriptorSha256: '1'.repeat(64),
      manifestSha256: '2'.repeat(64),
      releaseId: 'release_durable_setup_test',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    bundle: {
      descriptorSha256: source.descriptorSha256,
      completeTreeSha256: source.completeTreeSha256,
    },
  }
  const journey = createSemesterSetupJourney({
    stateStore: createSetupEnvelopeStore({ appDataRoot }),
    release,
    bundleSource: source,
    resolveParent: async (selectionId) =>
      selectionId === authority.selectionId
        ? {
            authority,
            presentation: {
              selectionId,
              displayName: '문서',
              safeDisplayLocation: 'Home › Documents',
            },
          }
        : null,
    createSetupId: () => 'setup_transaction_crash_worker',
    fault(point) {
      if (point === faultPoint) {
        process.kill(process.pid, 'SIGKILL')
      }
    },
  })
  const prepared = await journey.reconcile({
    kind: 'prepare',
    input: {
      yearLevel: 2,
      term: { key: '2', displayName: '2학기' },
      parentSelectionId: authority.selectionId,
      leafName: '2026-2학기',
    },
  })
  if (prepared.projection.state !== 'confirmation_required') {
    throw new Error('confirmation was not produced')
  }
  await journey.reconcile({
    kind: 'approve',
    setupPlanId: prepared.projection.setupPlanId,
  })
}
