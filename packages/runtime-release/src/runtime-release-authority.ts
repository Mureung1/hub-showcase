/// <reference types="node" />

import { createHash } from 'node:crypto'

import {
  RuntimeReleaseContractError,
  decodeRuntimeReleaseDescriptor,
} from './contract.js'
import type {
  RuntimeReleaseDescriptor,
  RuntimeResolutionError,
  RuntimeResolutionErrorCode,
} from './contract.js'
import {
  CanonicalRuntimeManifestContractError,
  decodeCanonicalRuntimeManifest,
} from './canonical-runtime-manifest.js'
import type { CanonicalRuntimeManifest } from './canonical-runtime-manifest.js'

export type RuntimeReleaseIdentity = {
  readonly archiveSha256: string
  readonly manifestSha256: string
  readonly releaseId: string
  readonly runtimeContractVersion: number
  readonly target: 'darwin-arm64'
}

export type RuntimeReleaseAdmission = {
  readonly descriptor: RuntimeReleaseDescriptor
  readonly manifest: CanonicalRuntimeManifest
  readonly identity: RuntimeReleaseIdentity
}

export type RuntimeReleaseAdmissionInput = {
  readonly descriptor: unknown
  readonly canonicalManifestResource: string
  readonly canonicalManifestBytes: Uint8Array
  readonly application: {
    readonly packageName: string
    readonly version: string
  }
  readonly target: string
  readonly runtimeContractVersion: number
}

export type RuntimeReleaseAuthorityEvidence = Readonly<
  {
    readonly kind: string
  } & Record<string, unknown>
>

export class RuntimeReleaseAuthorityError extends Error {
  readonly #failure: RuntimeResolutionError
  readonly #evidence: RuntimeReleaseAuthorityEvidence

  constructor(
    failure: RuntimeResolutionError,
    evidence: RuntimeReleaseAuthorityEvidence,
  ) {
    super(failure.remediation)
    Object.defineProperty(this, 'name', {
      configurable: true,
      value: 'RuntimeReleaseAuthorityError',
      writable: true,
    })
    this.#failure = failure
    this.#evidence = evidence
  }

  get failure(): RuntimeResolutionError {
    return this.#failure
  }

  diagnosticEvidence(): RuntimeReleaseAuthorityEvidence {
    return this.#evidence
  }
}

export function admitRuntimeRelease(
  input: RuntimeReleaseAdmissionInput,
): RuntimeReleaseAdmission {
  let descriptor: RuntimeReleaseDescriptor
  try {
    descriptor = decodeRuntimeReleaseDescriptor(input.descriptor)
  } catch (error) {
    if (error instanceof RuntimeReleaseContractError) {
      throw runtimeAuthorityError('runtime_incompatible', {
        kind: 'descriptor_invalid',
        cause: error,
      })
    }
    throw error
  }

  assertCanonicalRuntimeReleaseUrls(descriptor)

  if (
    input.application.packageName !== descriptor.launcher.packageName ||
    input.application.version !== descriptor.launcher.version ||
    input.canonicalManifestResource !==
      descriptor.manifest.packageResource ||
    input.target !== descriptor.runtime.target ||
    input.runtimeContractVersion !==
      descriptor.runtime.runtimeContractVersion
  ) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'application_binding_mismatch',
      expected: {
        application: descriptor.launcher,
        canonicalManifestResource:
          descriptor.manifest.packageResource,
        target: descriptor.runtime.target,
        runtimeContractVersion:
          descriptor.runtime.runtimeContractVersion,
      },
      actual: {
        application: input.application,
        canonicalManifestResource: input.canonicalManifestResource,
        target: input.target,
        runtimeContractVersion: input.runtimeContractVersion,
      },
    })
  }

  const manifestBytes = Buffer.from(input.canonicalManifestBytes)
  const manifestSha256 = createHash('sha256')
    .update(manifestBytes)
    .digest('hex')
  if (
    manifestBytes.byteLength !== descriptor.manifest.bytes ||
    manifestSha256 !== descriptor.manifest.sha256
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'manifest_binding_mismatch',
      expected: descriptor.manifest,
      actual: {
        bytes: manifestBytes.byteLength,
        sha256: manifestSha256,
      },
    })
  }

  let manifestValue: unknown
  try {
    const encoded = new TextDecoder('utf-8', { fatal: true }).decode(
      manifestBytes,
    )
    manifestValue = JSON.parse(encoded) as unknown
  } catch (error) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'manifest_bytes_invalid',
      cause: error,
    })
  }

  let manifest: CanonicalRuntimeManifest
  try {
    manifest = decodeCanonicalRuntimeManifest(manifestValue)
  } catch (error) {
    if (error instanceof CanonicalRuntimeManifestContractError) {
      throw runtimeAuthorityError('runtime_incompatible', {
        kind: 'manifest_contract_invalid',
        cause: error,
      })
    }
    throw error
  }

  if (
    manifest.schema_version !== descriptor.manifest.schemaVersion ||
    manifest.target.id !== descriptor.runtime.target ||
    manifest.runtime_contract_version !==
      descriptor.runtime.runtimeContractVersion
  ) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'manifest_identity_mismatch',
      descriptor: {
        schemaVersion: descriptor.manifest.schemaVersion,
        target: descriptor.runtime.target,
        runtimeContractVersion:
          descriptor.runtime.runtimeContractVersion,
      },
      manifest: {
        schemaVersion: manifest.schema_version,
        target: manifest.target.id,
        runtimeContractVersion: manifest.runtime_contract_version,
      },
    })
  }

  return {
    descriptor,
    manifest,
    identity: {
      archiveSha256: descriptor.archive.sha256,
      manifestSha256,
      releaseId: descriptor.runtime.releaseId,
      runtimeContractVersion:
        descriptor.runtime.runtimeContractVersion,
      target: descriptor.runtime.target,
    },
  }
}

function assertCanonicalRuntimeReleaseUrls(
  descriptor: RuntimeReleaseDescriptor,
): void {
  const repository = descriptor.distribution.repository
  let parsedRepository: URL
  try {
    parsedRepository = new URL(repository)
  } catch (error) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'descriptor_repository_url_invalid',
      cause: error,
    })
  }

  const repositoryMatch =
    /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/u.exec(
      repository,
    )
  if (
    repositoryMatch === null ||
    repositoryMatch[1] === '.' ||
    repositoryMatch[1] === '..' ||
    repositoryMatch[2] === '.' ||
    repositoryMatch[2] === '..' ||
    parsedRepository.protocol !== 'https:' ||
    parsedRepository.hostname !== 'github.com' ||
    parsedRepository.port !== '' ||
    parsedRepository.username !== '' ||
    parsedRepository.password !== '' ||
    parsedRepository.search !== '' ||
    parsedRepository.hash !== '' ||
    parsedRepository.pathname !==
      `/${repositoryMatch[1]}/${repositoryMatch[2]}`
  ) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'descriptor_repository_url_noncanonical',
      repository,
    })
  }

  const expectedArchiveUrl =
    `${repository}/releases/download/` +
    `${descriptor.distribution.runtimeAssetReleaseTag}/` +
    descriptor.archive.assetName
  let parsedArchive: URL
  try {
    parsedArchive = new URL(descriptor.archive.url)
  } catch (error) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'descriptor_archive_url_invalid',
      cause: error,
    })
  }
  if (
    descriptor.archive.url !== expectedArchiveUrl ||
    parsedArchive.protocol !== 'https:' ||
    parsedArchive.hostname !== 'github.com' ||
    parsedArchive.port !== '' ||
    parsedArchive.username !== '' ||
    parsedArchive.password !== '' ||
    parsedArchive.search !== '' ||
    parsedArchive.hash !== '' ||
    parsedArchive.pathname !==
      `/${repositoryMatch[1]}/${repositoryMatch[2]}/releases/download/` +
        `${descriptor.distribution.runtimeAssetReleaseTag}/` +
        descriptor.archive.assetName
  ) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'descriptor_archive_url_noncanonical',
      archiveUrl: descriptor.archive.url,
    })
  }
}

export async function runAfterRuntimeReleaseAdmission<T>(
  input: RuntimeReleaseAdmissionInput,
  effect: (admission: RuntimeReleaseAdmission) => Promise<T>,
): Promise<T> {
  const admission = admitRuntimeRelease(input)
  return effect(admission)
}

export function runtimeAuthorityError(
  code: RuntimeResolutionErrorCode,
  evidence: RuntimeReleaseAuthorityEvidence,
): RuntimeReleaseAuthorityError {
  return new RuntimeReleaseAuthorityError(
    {
      code,
      retryable: retryableFor(code),
      remediation: remediationFor(code),
    },
    evidence,
  )
}

function retryableFor(code: RuntimeResolutionErrorCode): boolean {
  return (
    code === 'runtime_cancelled' ||
    code === 'runtime_network_unavailable' ||
    code === 'runtime_storage_unavailable'
  )
}

function remediationFor(code: RuntimeResolutionErrorCode): string {
  switch (code) {
    case 'runtime_cancelled':
      return 'Run the same exact AY-PLE command again when ready.'
    case 'runtime_incompatible':
      return 'Use a supported exact AY-PLE release.'
    case 'runtime_network_unavailable':
      return 'Check the network connection and retry the same exact release.'
    case 'runtime_access_denied':
      return 'Check the public release status before retrying.'
    case 'runtime_release_unavailable':
      return 'Use a currently supported exact AY-PLE release.'
    case 'runtime_integrity_failed':
    case 'runtime_archive_unsafe':
      return 'Do not run these bytes; check for a supported exact release.'
    case 'runtime_storage_unavailable':
      return 'Check available storage and AY-PLE directory permissions.'
    case 'runtime_cache_unsafe':
    case 'runtime_recovery_required':
      return 'Use AY-PLE support recovery without deleting app data.'
  }
}
