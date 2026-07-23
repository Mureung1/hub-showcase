import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  createSemesterWorkspaceAdmission,
  createSemesterWorkspaceAdmissionForTesting,
} from './admission.js'
import type {
  AuthorityBoundWorkspacePlan,
  WorkspaceParentAuthority,
} from './contract.js'
import { decodeSemesterWorkspaceV3Bytes } from './v3-codec.js'

test('the preplanned root marker binds every pending workspace receipt input without post-mkdir identity', async () => {
  const fixture = await createFixture('receipt-bindings')
  const admission = createSemesterWorkspaceAdmissionForTesting({
    fault(point) {
      if (point === 'after_marker_file_sync') {
        throw new Error(`fault:${point}`)
      }
    },
  })
  const inspection = await admission.inspect(fixture.intent)
  assert.equal(inspection.outcome, 'new_target')
  if (inspection.outcome !== 'new_target') assert.fail('plan required')

  try {
    await assert.rejects(
      admission.apply(inspection.plan),
      /fault:after_marker_file_sync/,
    )
    const markerBytes = await readMarker(inspection.plan)
    const marker = decodeMarkerForEvidenceTest(markerBytes)
    const aggregateBytes = Buffer.from(
      marker.authority.aggregateBytesBase64,
      'base64',
    )
    const aggregate = decodeSemesterWorkspaceV3Bytes(aggregateBytes)

    assert.equal(marker.setupId, inspection.plan.planId)
    assert.equal(marker.authorityDigest, inspection.plan.authorityDigest)
    assert.equal(
      marker.authorityDigest,
      sha256(Buffer.from(JSON.stringify(marker.authority), 'utf8')),
    )
    assert.equal(
      marker.authority.aggregateSha256,
      sha256(aggregateBytes),
    )
    assert.equal(
      marker.authority.ownedScaffoldPlanSha256,
      sha256(
        Buffer.from(
          JSON.stringify(marker.authority.ownedScaffoldPlan),
          'utf8',
        ),
      ),
    )
    assert.equal(marker.authority.workspaceId, aggregate.manifest.workspaceId)
    assert.equal('rootIdentity' in marker, false)
    assert.equal('rootIdentity' in marker.authority, false)

    assert.deepEqual(
      {
        setupId: marker.setupId,
        setupPlanId: inspection.plan.planId,
        plan: {
          canonicalBytesSha256: marker.authorityDigest,
          semester: aggregate.manifest.semester,
          target: {
            canonicalParent:
              marker.authority.parent.canonicalParent,
            parentDevice: marker.authority.parent.parentDevice,
            parentInode: marker.authority.parent.parentInode,
            leafName: marker.authority.leafName,
            canonicalTarget: marker.authority.canonicalRoot,
          },
        },
        workspace: {
          workspaceId: marker.authority.workspaceId,
          formatVersion: 3,
          rootMarkerSha256: sha256(markerBytes),
          ownedScaffoldPlanSha256:
            marker.authority.ownedScaffoldPlanSha256,
          expectedInitialAggregateSha256:
            marker.authority.aggregateSha256,
        },
      },
      {
        setupId: inspection.plan.planId,
        setupPlanId: inspection.plan.planId,
        plan: {
          canonicalBytesSha256: inspection.plan.authorityDigest,
          semester: fixture.intent.semester,
          target: {
            canonicalParent: fixture.intent.parent.canonicalParent,
            parentDevice: fixture.intent.parent.parentDevice,
            parentInode: fixture.intent.parent.parentInode,
            leafName: fixture.intent.leafName,
            canonicalTarget: inspection.plan.canonicalRoot,
          },
        },
        workspace: {
          workspaceId: aggregate.manifest.workspaceId,
          formatVersion: 3,
          rootMarkerSha256: sha256(markerBytes),
          ownedScaffoldPlanSha256:
            marker.authority.ownedScaffoldPlanSha256,
          expectedInitialAggregateSha256: sha256(aggregateBytes),
        },
      },
    )
    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'resume_owned',
        setupId: `${inspection.plan.planId}-different`,
        canonicalRoot: inspection.plan.canonicalRoot,
      }),
      { outcome: 'collision', readOnly: false },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('cross-instance resume rejects workspace identity or aggregate changes that retain the old authority digest', async () => {
  for (const tamper of ['workspace_id', 'aggregate'] as const) {
    const fixture = await createFixture(`tampered-${tamper}`)
    const admission = createSemesterWorkspaceAdmissionForTesting({
      fault(point) {
        if (point === 'after_marker_file_sync') {
          throw new Error(`fault:${point}`)
        }
      },
    })
    const inspection = await admission.inspect(fixture.intent)
    assert.equal(inspection.outcome, 'new_target')
    if (inspection.outcome !== 'new_target') assert.fail('plan required')

    try {
      await assert.rejects(
        admission.apply(inspection.plan),
        /fault:after_marker_file_sync/,
      )
      const markerPath = markerPathFor(inspection.plan)
      const marker = decodeMarkerForEvidenceTest(await readFile(markerPath))
      if (tamper === 'workspace_id') {
        marker.authority.workspaceId =
          `workspace_${'f'.repeat(32)}`
      } else {
        const aggregateBytes = Buffer.from(
          marker.authority.aggregateBytesBase64,
          'base64',
        )
        const aggregate = JSON.parse(
          aggregateBytes.toString('utf8'),
        ) as {
          manifest: { workspaceId: string }
        }
        aggregate.manifest.workspaceId = `workspace_${'e'.repeat(32)}`
        const changedBytes = Buffer.from(
          `${JSON.stringify(aggregate, null, 2)}\n`,
          'utf8',
        )
        marker.authority.workspaceId = aggregate.manifest.workspaceId
        marker.authority.aggregateBytesBase64 =
          changedBytes.toString('base64')
        marker.authority.aggregateSha256 = sha256(changedBytes)
        marker.authority.ownedScaffoldPlan.state.sha256 =
          marker.authority.aggregateSha256
        marker.authority.ownedScaffoldPlan.state.bytes =
          changedBytes.byteLength
        marker.authority.ownedScaffoldPlanSha256 = sha256(
          Buffer.from(
            JSON.stringify(marker.authority.ownedScaffoldPlan),
            'utf8',
          ),
        )
      }
      await writeFile(
        markerPath,
        `${JSON.stringify(marker, null, 2)}\n`,
      )

      assert.deepEqual(
        await createSemesterWorkspaceAdmission().inspect({
          kind: 'resume_owned',
          setupId: inspection.plan.planId,
          canonicalRoot: inspection.plan.canonicalRoot,
        }),
        { outcome: 'collision', readOnly: false },
        tamper,
      )
      assert.deepEqual(
        await readFile(markerPath),
        Buffer.from(`${JSON.stringify(marker, null, 2)}\n`, 'utf8'),
        tamper,
      )
    } finally {
      await fixture.cleanup()
    }
  }
})

type EvidenceMarker = {
  readonly kind: 'ay-ple.workspace-admission-evidence'
  readonly formatVersion: 2
  readonly setupId: string
  readonly authorityDigest: string
  authority: {
    readonly setupNonce: string
    readonly operation: 'create'
    readonly canonicalRoot: string
    readonly parent: WorkspaceParentAuthority
    readonly leafName: string
    workspaceId: string
    aggregateBytesBase64: string
    aggregateSha256: string
    ownedScaffoldPlan: {
      readonly formatVersion: 1
      readonly directories: readonly string[]
      state: {
        readonly relativePath: string
        readonly temporaryRelativePath: string
        bytes: number
        sha256: string
      }
    }
    ownedScaffoldPlanSha256: string
  }
}

function decodeMarkerForEvidenceTest(bytes: Buffer): EvidenceMarker {
  return JSON.parse(bytes.toString('utf8')) as EvidenceMarker
}

function readMarker(plan: AuthorityBoundWorkspacePlan): Promise<Buffer> {
  return readFile(markerPathFor(plan))
}

function markerPathFor(plan: AuthorityBoundWorkspacePlan): string {
  return path.join(
    plan.canonicalRoot,
    '.ay-ple',
    '.workspace-admission.json',
  )
}

async function createFixture(leafName: string): Promise<{
  readonly intent: {
    readonly kind: 'create'
    readonly parent: WorkspaceParentAuthority
    readonly semester: {
      readonly yearLevel: 3
      readonly term: {
        readonly key: 'summer'
        readonly displayName: '여름 계절학기'
      }
    }
    readonly leafName: string
  }
  cleanup(): Promise<void>
}> {
  const root = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-admission-evidence-'),
  )
  const parent = path.join(root, 'parent')
  await mkdir(parent)
  const canonicalParent = await realpath(parent)
  const stats = await import('node:fs/promises').then(({ lstat }) =>
    lstat(canonicalParent, { bigint: true }),
  )
  return {
    intent: {
      kind: 'create',
      parent: {
        selectionId: 'parent_selection_evidence',
        canonicalParent,
        parentDevice: stats.dev.toString(),
        parentInode: stats.ino.toString(),
      },
      semester: {
        yearLevel: 3,
        term: {
          key: 'summer',
          displayName: '여름 계절학기',
        },
      },
      leafName,
    },
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}
