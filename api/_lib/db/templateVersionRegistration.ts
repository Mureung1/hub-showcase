import type { TemplateVersionInput } from './repositories.js'

export type TemplateManifestRegistrationSource = {
  checksum: string
  reviewStatus: 'approved' | 'draft' | 'retired'
  version: string
}

export type ApprovedTemplateVersionRegistrationInput = TemplateVersionInput & {
  isActive: true
  reviewedAt: Date
  reviewStatus: 'approved'
}

const sha256Pattern = /^[0-9a-f]{64}$/u

function assertApprovedManifest(
  manifest: TemplateManifestRegistrationSource,
): asserts manifest is TemplateManifestRegistrationSource & { reviewStatus: 'approved' } {
  if (manifest.reviewStatus !== 'approved') {
    throw new Error(
      `Template manifest must be approved before registration: ${manifest.reviewStatus}`,
    )
  }
}

const assertValidReviewedAt = (reviewedAt: Date) => {
  if (!Number.isFinite(reviewedAt.getTime())) {
    throw new Error('Template manifest reviewedAt must be a valid date')
  }
}

const assertValidVersionMetadata = (manifest: TemplateManifestRegistrationSource) => {
  if (manifest.version.trim().length === 0 || manifest.version.length > 64) {
    throw new Error('Template manifest version must be between 1 and 64 characters')
  }

  if (!sha256Pattern.test(manifest.checksum)) {
    throw new Error('Template manifest checksum must be a lowercase SHA-256 digest')
  }
}

export const toApprovedTemplateVersionRegistration = (
  manifest: TemplateManifestRegistrationSource,
  reviewedAt: Date,
): ApprovedTemplateVersionRegistrationInput => {
  assertApprovedManifest(manifest)
  assertValidReviewedAt(reviewedAt)
  assertValidVersionMetadata(manifest)

  return {
    checksum: manifest.checksum,
    isActive: true,
    reviewedAt: new Date(reviewedAt.getTime()),
    reviewStatus: 'approved',
    version: manifest.version,
  }
}
