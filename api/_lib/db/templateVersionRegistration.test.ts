import { describe, expect, it } from 'vitest'
import { toApprovedTemplateVersionRegistration } from './templateVersionRegistration.js'

const approvedManifest = {
  checksum: 'a'.repeat(64),
  reviewStatus: 'approved' as const,
  version: 't25-approved-2026-07-20.1',
}

describe('T25 template version registration boundary', () => {
  it('creates an active registration input only from an approved manifest and valid review time', () => {
    const reviewedAt = new Date('2026-07-20T09:30:00.000Z')

    const registration = toApprovedTemplateVersionRegistration(approvedManifest, reviewedAt)

    expect(registration).toEqual({
      checksum: approvedManifest.checksum,
      isActive: true,
      reviewedAt,
      reviewStatus: 'approved',
      version: approvedManifest.version,
    })
    expect(registration.reviewedAt).not.toBe(reviewedAt)
  })

  it.each(['draft', 'retired'] as const)(
    'blocks a %s manifest from becoming an approved active registration',
    (reviewStatus) => {
      expect(() =>
        toApprovedTemplateVersionRegistration(
          { ...approvedManifest, reviewStatus },
          new Date('2026-07-20T09:30:00.000Z'),
        ),
      ).toThrowError(`Template manifest must be approved before registration: ${reviewStatus}`)
    },
  )

  it('blocks an approved manifest without a valid review time', () => {
    expect(() =>
      toApprovedTemplateVersionRegistration(approvedManifest, new Date(Number.NaN)),
    ).toThrowError('Template manifest reviewedAt must be a valid date')
  })

  it.each([
    {
      expectedError: 'Template manifest version must be between 1 and 64 characters',
      manifest: { ...approvedManifest, version: '   ' },
    },
    {
      expectedError: 'Template manifest version must be between 1 and 64 characters',
      manifest: { ...approvedManifest, version: 'v'.repeat(65) },
    },
    {
      expectedError: 'Template manifest checksum must be a lowercase SHA-256 digest',
      manifest: { ...approvedManifest, checksum: 'A'.repeat(64) },
    },
  ])('blocks metadata that violates the template_versions schema boundary', ({ expectedError, manifest }) => {
    expect(() =>
      toApprovedTemplateVersionRegistration(
        manifest,
        new Date('2026-07-20T09:30:00.000Z'),
      ),
    ).toThrowError(expectedError)
  })

  it('copies only the approved template version metadata allowlist', () => {
    const unsafeManifest = {
      ...approvedManifest,
      entries: [{ message: 'DB에 저장하면 안 되는 템플릿 본문' }],
      message: 'DB에 저장하면 안 되는 템플릿 본문',
      receivedMessage: 'DB에 저장하면 안 되는 사용자 원문',
      templateCount: 288,
    }

    const registration = toApprovedTemplateVersionRegistration(
      unsafeManifest,
      new Date('2026-07-20T09:30:00.000Z'),
    )

    expect(Object.keys(registration).sort()).toEqual([
      'checksum',
      'isActive',
      'reviewStatus',
      'reviewedAt',
      'version',
    ])
    const serializedRegistration = JSON.stringify(registration)
    expect(serializedRegistration).not.toContain(unsafeManifest.entries[0].message)
    expect(serializedRegistration).not.toContain(unsafeManifest.receivedMessage)
  })
})
