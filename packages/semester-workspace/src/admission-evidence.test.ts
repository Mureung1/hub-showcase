import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
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

test('the preplanned root marker privately binds authority to a digest-free opaque plan token', async () => {
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
  const descriptionBeforeApply = admission.describe(inspection.plan)
  assert.ok(descriptionBeforeApply)
  assert.equal(
    admission.describe({
      ...inspection.plan,
      authorityDigest: 'f'.repeat(64),
    }),
    null,
  )
  assert.equal(
    admission.describe({
      ...inspection.plan,
      planId: `workspace_plan_${'f'.repeat(32)}`,
    }),
    null,
  )

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

    assert.match(
      inspection.plan.planId,
      /^workspace_plan_[0-9a-f]{32}$/,
    )
    assert.equal(
      inspection.plan.planId.includes(
        inspection.plan.authorityDigest,
      ),
      false,
    )
    assert.equal(
      markerBytes.includes(Buffer.from(inspection.plan.planId, 'utf8')),
      false,
    )
    assert.equal('setupId' in marker, false)
    assert.equal('setupPlanId' in marker, false)
    assert.equal(marker.authorityDigest, inspection.plan.authorityDigest)
    assert.equal(
      marker.authorityDigest,
      sha256(Buffer.from(JSON.stringify(marker.authority), 'utf8')),
    )
    assert.equal(
      marker.setupPlanBinding,
      hmacSha256(
        inspection.plan.planId,
        Buffer.from(
          JSON.stringify({
            kind: marker.kind,
            formatVersion: marker.formatVersion,
            authorityDigest: marker.authorityDigest,
            authority: marker.authority,
          }),
          'utf8',
        ),
      ),
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

    const canonicalReceiptPlan = {
      semester: fixture.intent.semester,
      target: {
        canonicalParent: fixture.intent.parent.canonicalParent,
        parentDevice: fixture.intent.parent.parentDevice,
        parentInode: fixture.intent.parent.parentInode,
        leafName: fixture.intent.leafName,
        canonicalTarget: inspection.plan.canonicalRoot,
      },
    }
    const expectedDescription = {
      setupPlanId: inspection.plan.planId,
      privateBinding: {
        plan: {
          canonicalBytesSha256: sha256(
            Buffer.from(JSON.stringify(canonicalReceiptPlan), 'utf8'),
          ),
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
    } as const
    assert.deepEqual(descriptionBeforeApply, expectedDescription)
    assert.notEqual(
      descriptionBeforeApply.privateBinding.plan.canonicalBytesSha256,
      inspection.plan.authorityDigest,
    )
    assert.equal('setupId' in descriptionBeforeApply, false)
    assert.equal('authorityDigest' in descriptionBeforeApply, false)
    assert.equal('setupPlanBinding' in descriptionBeforeApply, false)

    const mutableDescription = descriptionBeforeApply as {
      privateBinding: { plan: { target: { leafName: string } } }
    }
    mutableDescription.privateBinding.plan.target.leafName = 'tampered-clone'
    assert.deepEqual(admission.describe(inspection.plan), expectedDescription)

    const resumedAdmission = createSemesterWorkspaceAdmission()
    const resumed = await resumedAdmission.inspect({
      kind: 'resume_owned',
      setupId: inspection.plan.planId,
      canonicalRoot: inspection.plan.canonicalRoot,
    })
    assert.equal(resumed.outcome, 'owned_incomplete')
    if (resumed.outcome !== 'owned_incomplete') {
      assert.fail('owned resume plan required')
    }
    assert.equal(resumedAdmission.describe(resumed.plan), null)
    assert.deepEqual(
      await createSemesterWorkspaceAdmission().inspect({
        kind: 'resume_owned',
        setupId: `${inspection.plan.planId}-different`,
        canonicalRoot: inspection.plan.canonicalRoot,
      }),
      { outcome: 'collision', readOnly: false },
    )
    const pristineResumePlan = { ...resumed.plan }
    const mutableResumePlan = resumed.plan as {
      authorityDigest: string
    }
    mutableResumePlan.authorityDigest = '0'.repeat(64)
    assert.deepEqual(await resumedAdmission.apply(resumed.plan), {
      outcome: 'authority_changed',
    })
    assert.deepEqual(await readMarker(inspection.plan), markerBytes)
    const resumedApply = await resumedAdmission.apply(pristineResumePlan)
    assert.equal(resumedApply.outcome, 'resumed')
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
  readonly formatVersion: 3
  readonly setupPlanBinding: string
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

function hmacSha256(key: string, bytes: Uint8Array): string {
  return createHmac('sha256', key).update(bytes).digest('hex')
}
