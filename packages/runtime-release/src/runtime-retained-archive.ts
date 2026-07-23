/// <reference types="node" />

import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import {
  lstat,
  open,
  readdir,
  realpath,
  rename,
} from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

import {
  hashRuntimeArchiveFile,
} from './runtime-archive-download.js'
import type {
  RuntimeArchiveVerificationSnapshot,
} from './runtime-archive-download.js'
import {
  createRuntimeQuarantineIdentity,
  revalidateRuntimeCacheRootForMutation,
} from './runtime-cache-authority.js'
import type {
  RuntimeCacheLayout,
  RuntimeCacheMutationAuthority,
  RuntimeFileSystemIdentity,
} from './runtime-cache-authority.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmission,
} from './runtime-release-authority.js'
import {
  isStrongArchiveEtag,
} from './runtime-archive-transport.js'

const MAX_JOURNAL_BYTES = 4096n

export type RetainedRuntimeArchiveInput = {
  readonly admission: RuntimeReleaseAdmission
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly signal: AbortSignal
}

type SingleArchiveAuthority = {
  readonly kind: 'retained_archive_quarantine_authority'
  readonly form: 'single'
  readonly archiveIdentity: RuntimeFileSystemIdentity
  readonly archiveSize: string
}

type PairedArchiveAuthority = {
  readonly kind: 'retained_archive_quarantine_authority'
  readonly form: 'exact-pair'
  readonly phase: 'canonical' | 'partial-quarantined'
  readonly archiveIdentity: RuntimeFileSystemIdentity
  readonly archiveSize: string
  readonly partialRootIdentity: RuntimeFileSystemIdentity
  readonly transactionNonce?: string
}

export type RetainedArchiveQuarantineAuthority =
  | SingleArchiveAuthority
  | PairedArchiveAuthority

export type RetainedRuntimeArchiveState =
  | {
      readonly kind: 'absent'
    }
  | {
      readonly kind: 'verified'
      readonly archive: RuntimeArchiveVerificationSnapshot
    }
  | {
      readonly kind: 'owned-invalid'
      readonly authority: RetainedArchiveQuarantineAuthority
    }

export type RetainedArchiveQuarantineResult = {
  readonly kind: 'retained_archive_quarantined'
  readonly cancelledAfterCommit: boolean
  readonly transactionNonce: string
}

/**
 * Package-private fault seam. Production callers must omit it.
 */
export type RetainedArchiveQuarantineTestOptions = {
  readonly afterPartialRename?: () => Promise<void>
  readonly afterPartialSync?: () => Promise<void>
  readonly beforeArchiveRename?: () => Promise<void>
  readonly afterArchiveRename?: () => Promise<void>
  readonly afterArchiveSync?: () => Promise<void>
}

export type RetainedArchiveInspectionTestOptions = {
  readonly afterArchiveHash?: () => Promise<void>
}

/**
 * Classifies only evidence that is safe to act on. Ambiguous ownership,
 * alias topology, or identity drift throws recovery_required instead of
 * returning a state that a caller could accidentally continue from.
 */
export async function inspectRetainedRuntimeArchive(
  input: RetainedRuntimeArchiveInput,
  testOptions: RetainedArchiveInspectionTestOptions = {},
): Promise<RetainedRuntimeArchiveState> {
  assertBindings(input)
  assertNotCancelled(input.signal)
  const cache = await revalidateArchiveAuthority(input)
  const stats = await lstatIfPresent(input.layout.archive.path)
  if (stats === undefined) return { kind: 'absent' }
  const archive = assertOwnedArchiveStats(
    stats,
    cache,
    undefined,
  )

  let authority: RetainedArchiveQuarantineAuthority
  if (stats.nlink === 1n) {
    authority = {
      kind: 'retained_archive_quarantine_authority',
      form: 'single',
      archiveIdentity: archive,
      archiveSize: String(stats.size),
    }
  } else if (stats.nlink === 2n) {
    const canonicalPair = await inspectExactPair({
      archiveIdentity: archive,
      archiveSize: String(stats.size),
      expectedRootDevice: cache.partials.device,
      input,
      rootPath: input.layout.partial.root,
    })
    if (canonicalPair !== undefined) {
      authority = {
        kind: 'retained_archive_quarantine_authority',
        form: 'exact-pair',
        phase: 'canonical',
        archiveIdentity: archive,
        archiveSize: String(stats.size),
        partialRootIdentity: canonicalPair,
      }
    } else {
      const inflight = await findPartialQuarantinePair({
        archiveIdentity: archive,
        archiveSize: String(stats.size),
        cache,
        input,
      })
      if (inflight === undefined) throw ambiguousArchive()
      authority = {
        kind: 'retained_archive_quarantine_authority',
        form: 'exact-pair',
        phase: 'partial-quarantined',
        archiveIdentity: archive,
        archiveSize: String(stats.size),
        partialRootIdentity: inflight.rootIdentity,
        transactionNonce: inflight.transactionNonce,
      }
    }
  } else {
    throw ambiguousArchive()
  }

  if (
    !(await archivePathIsStable(input, cache, authority))
  ) {
    throw ambiguousArchive()
  }
  if (authority.form === 'exact-pair') {
    if (authority.phase === 'partial-quarantined') {
      return { kind: 'owned-invalid', authority }
    }
    if (
      !(await pairIsStable(
        input,
        cache,
        authority,
        input.layout.partial.root,
      ))
    ) {
      throw ambiguousArchive()
    }
  }

  const expectedBytes =
    input.admission.descriptor.archive.bytes
  if (stats.size !== BigInt(expectedBytes)) {
    return { kind: 'owned-invalid', authority }
  }
  const digest = await hashStableArchive(
    input,
    cache,
    authority,
  )
  await testOptions.afterArchiveHash?.()
  if (
    !(await archivePathIsStable(input, cache, authority)) ||
    (authority.form === 'exact-pair' &&
      !(await pairIsStable(
        input,
        cache,
        authority,
        input.layout.partial.root,
      )))
  ) {
    throw ambiguousArchive()
  }
  if (
    digest !== input.admission.descriptor.archive.sha256
  ) {
    return { kind: 'owned-invalid', authority }
  }

  if (
    authority.form === 'exact-pair' &&
    !(await pairJournalAllowsReuse(input))
  ) {
    if (
      await pairIsStable(
        input,
        cache,
        authority,
        input.layout.partial.root,
      )
    ) {
      return { kind: 'owned-invalid', authority }
    }
    throw ambiguousArchive()
  }
  return {
    kind: 'verified',
    archive: {
      kind: 'runtime_archive_verification_snapshot',
      release: input.admission.identity,
      archivePath: input.layout.archive.path,
      archiveIdentity: authority.archiveIdentity,
      bytes: expectedBytes,
      sha256: digest,
    },
  }
}

/**
 * Quarantines exactly the authority returned by the classifier. Pair
 * quarantine moves the partial root first so a process fault leaves a
 * recognizable phase that a later invocation can complete.
 */
export async function quarantineRetainedRuntimeArchive(
  input: RetainedRuntimeArchiveInput & {
    readonly authority: RetainedArchiveQuarantineAuthority
    readonly transactionNonce: string
  },
  testOptions: RetainedArchiveQuarantineTestOptions = {},
): Promise<RetainedArchiveQuarantineResult> {
  assertTransactionNonce(input.transactionNonce)
  assertNotCancelled(input.signal)
  const observed = await inspectRetainedRuntimeArchive(input)
  if (
    observed.kind !== 'owned-invalid' ||
    !sameQuarantineAuthority(
      observed.authority,
      input.authority,
    )
  ) {
    throw ambiguousArchive()
  }
  const authority = observed.authority
  const transactionNonce =
    authority.form === 'exact-pair' &&
    authority.phase === 'partial-quarantined'
      ? authority.transactionNonce!
      : input.transactionNonce
  const archiveDestination = createRuntimeQuarantineIdentity(
    input.layout,
    transactionNonce,
    'archive',
  ).path
  const partialDestination = createRuntimeQuarantineIdentity(
    input.layout,
    transactionNonce,
    'partial',
  ).path
  const cache = await revalidateArchiveAuthority(input)
  let mutationStarted = false
  try {
    if (
      authority.form === 'exact-pair' &&
      authority.phase === 'canonical'
    ) {
      await assertPathAbsent(partialDestination)
      await assertPathAbsent(archiveDestination)
      await assertPairAuthority(
        input,
        cache,
        authority,
        input.layout.partial.root,
      )
      assertNotCancelled(input.signal)
      await assertPathAbsent(partialDestination)
      assertNotCancelled(input.signal)
      mutationStarted = true
      await rename(
        input.layout.partial.root,
        partialDestination,
      )
      await testOptions.afterPartialRename?.()
      await syncNamespacePair(
        cache.partials,
        input.layout.namespaces.partials,
        cache.quarantine,
        input.layout.namespaces.quarantine,
      )
      await assertPairAuthority(
        input,
        cache,
        {
          ...authority,
          phase: 'partial-quarantined',
          transactionNonce,
        },
        partialDestination,
      )
      await testOptions.afterPartialSync?.()
    } else if (
      authority.form === 'exact-pair' &&
      authority.phase === 'partial-quarantined'
    ) {
      await assertPathAbsent(archiveDestination)
      await assertPairAuthority(
        input,
        cache,
        authority,
        partialDestination,
      )
      assertNotCancelled(input.signal)
      mutationStarted = true
    } else {
      assertNotCancelled(input.signal)
    }

    await testOptions.beforeArchiveRename?.()
    if (!mutationStarted) assertNotCancelled(input.signal)
    if (authority.form === 'exact-pair') {
      await assertPairAuthority(
        input,
        cache,
        {
          ...authority,
          phase: 'partial-quarantined',
          transactionNonce,
        },
        partialDestination,
      )
    }
    await assertArchivePathAuthority(input, cache, authority)
    await assertPathAbsent(archiveDestination)
    if (!mutationStarted) assertNotCancelled(input.signal)
    mutationStarted = true
    await rename(
      input.layout.archive.path,
      archiveDestination,
    )
    await testOptions.afterArchiveRename?.()
    await syncNamespacePair(
      cache.archives,
      input.layout.namespaces.archives,
      cache.quarantine,
      input.layout.namespaces.quarantine,
    )
    await testOptions.afterArchiveSync?.()
    await assertQuarantineReadback({
      archiveDestination,
      authority,
      cache,
      input,
      partialDestination,
    })
    return {
      kind: 'retained_archive_quarantined',
      cancelledAfterCommit: input.signal.aborted,
      transactionNonce,
    }
  } catch (error) {
    if (!mutationStarted && error instanceof RuntimeReleaseAuthorityError) {
      throw error
    }
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_quarantine_incomplete',
      cause: error,
    })
  }
}

type ArchiveCacheAuthority = {
  readonly archives: RuntimeFileSystemIdentity
  readonly partials: RuntimeFileSystemIdentity
  readonly quarantine: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
}

async function revalidateArchiveAuthority(
  input: RetainedRuntimeArchiveInput,
): Promise<ArchiveCacheAuthority> {
  const current = await revalidateRuntimeCacheRootForMutation(
    input.mutationAuthority.snapshot,
  )
  const archives = current.snapshot.namespaceIdentities.archives
  const partials = current.snapshot.namespaceIdentities.partials
  const quarantine =
    current.snapshot.namespaceIdentities.quarantine
  if (
    archives === undefined ||
    partials === undefined ||
    quarantine === undefined ||
    archives.device !== partials.device ||
    archives.device !== quarantine.device
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_retained_archive_namespaces_invalid',
    })
  }
  await Promise.all([
    assertDirectoryIdentity(
      input.layout.namespaces.archives,
      archives,
    ),
    assertDirectoryIdentity(
      input.layout.namespaces.partials,
      partials,
    ),
    assertDirectoryIdentity(
      input.layout.namespaces.quarantine,
      quarantine,
    ),
  ])
  return {
    archives,
    partials,
    quarantine,
    expectedOwnerUid: current.snapshot.expectedOwnerUid,
  }
}

async function hashStableArchive(
  input: RetainedRuntimeArchiveInput,
  cache: ArchiveCacheAuthority,
  authority: RetainedArchiveQuarantineAuthority,
): Promise<string> {
  let handle: FileHandle | undefined
  try {
    handle = await open(
      input.layout.archive.path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    assertOwnedArchiveStats(
      await handle.stat({ bigint: true }),
      cache,
      authority,
    )
    const digest = await hashRuntimeArchiveFile(
      handle,
      input.admission.descriptor.archive.bytes,
      input.signal,
    )
    assertOwnedArchiveStats(
      await handle.stat({ bigint: true }),
      cache,
      authority,
    )
    if (
      !(await archivePathIsStable(
        input,
        cache,
        authority,
      ))
    ) {
      throw ambiguousArchive()
    }
    return digest
  } catch (error) {
    if (isCancellationError(error)) throw error
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw ambiguousArchive(error)
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

async function archivePathIsStable(
  input: RetainedRuntimeArchiveInput,
  cache: ArchiveCacheAuthority,
  authority: RetainedArchiveQuarantineAuthority,
): Promise<boolean> {
  try {
    await revalidateArchiveAuthority(input)
    assertOwnedArchiveStats(
      await lstat(input.layout.archive.path, {
        bigint: true,
      }),
      cache,
      authority,
    )
    return true
  } catch {
    return false
  }
}

async function assertArchivePathAuthority(
  input: RetainedRuntimeArchiveInput,
  cache: ArchiveCacheAuthority,
  authority: RetainedArchiveQuarantineAuthority,
): Promise<void> {
  if (!(await archivePathIsStable(input, cache, authority))) {
    throw ambiguousArchive()
  }
}

function assertOwnedArchiveStats(
  stats: BigIntStats,
  cache: ArchiveCacheAuthority,
  authority: RetainedArchiveQuarantineAuthority | undefined,
): RuntimeFileSystemIdentity {
  const identity = identityFromStats(stats)
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    (stats.nlink !== 1n && stats.nlink !== 2n) ||
    Number(stats.mode & 0o7777n) !== 0o600 ||
    identity.ownerUid !== cache.expectedOwnerUid ||
    identity.device !== cache.archives.device ||
    (authority !== undefined &&
      (stats.nlink !==
        (authority.form === 'single' ? 1n : 2n) ||
        String(stats.size) !== authority.archiveSize ||
        !sameIdentity(identity, authority.archiveIdentity)))
  ) {
    throw ambiguousArchive()
  }
  return identity
}

async function inspectExactPair(input: {
  readonly archiveIdentity: RuntimeFileSystemIdentity
  readonly archiveSize: string
  readonly expectedRootDevice: string
  readonly input: RetainedRuntimeArchiveInput
  readonly rootPath: string
}): Promise<RuntimeFileSystemIdentity | undefined> {
  let root: FileHandle | undefined
  let partial: FileHandle | undefined
  let journal: FileHandle | undefined
  try {
    root = await open(
      input.rootPath,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    const rootStats = await root.stat({ bigint: true })
    const rootIdentity = identityFromStats(rootStats)
    if (
      !rootStats.isDirectory() ||
      rootStats.isSymbolicLink() ||
      Number(rootStats.mode & 0o7777n) !== 0o700 ||
      rootIdentity.ownerUid !==
        input.input.mutationAuthority.snapshot.expectedOwnerUid ||
      rootIdentity.device !== input.expectedRootDevice ||
      (await realpath(input.rootPath)) !== input.rootPath
    ) {
      return undefined
    }
    const entries = (await readdir(input.rootPath)).sort()
    if (
      (entries.length !== 1 && entries.length !== 2) ||
      entries[0] !== 'archive.part' ||
      (entries.length === 2 && entries[1] !== 'journal.json')
    ) {
      return undefined
    }
    const partialPath = path.join(input.rootPath, 'archive.part')
    partial = await open(
      partialPath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    const partialStats = await partial.stat({ bigint: true })
    if (
      !isExactPairFile(
        partialStats,
        input.archiveIdentity,
        input.archiveSize,
      ) ||
      !sameStats(
        partialStats,
        await lstat(partialPath, { bigint: true }),
      )
    ) {
      return undefined
    }
    if (entries.length === 2) {
      const journalPath = path.join(input.rootPath, 'journal.json')
      journal = await open(
        journalPath,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      )
      const journalStats = await journal.stat({ bigint: true })
      if (
        !journalStats.isFile() ||
        journalStats.isSymbolicLink() ||
        journalStats.nlink !== 1n ||
        Number(journalStats.mode & 0o7777n) !== 0o600 ||
        Number(journalStats.uid) !==
          input.input.mutationAuthority.snapshot.expectedOwnerUid ||
        String(journalStats.dev) !== input.expectedRootDevice ||
        journalStats.size > MAX_JOURNAL_BYTES ||
        !sameStats(
          journalStats,
          await lstat(journalPath, { bigint: true }),
        )
      ) {
        return undefined
      }
    }
    if (
      !sameStats(
        rootStats,
        await lstat(input.rootPath, { bigint: true }),
      ) ||
      !sameStrings(entries, (await readdir(input.rootPath)).sort())
    ) {
      return undefined
    }
    return rootIdentity
  } catch {
    return undefined
  } finally {
    await journal?.close().catch(() => undefined)
    await partial?.close().catch(() => undefined)
    await root?.close().catch(() => undefined)
  }
}

async function pairJournalAllowsReuse(
  input: RetainedRuntimeArchiveInput,
): Promise<boolean> {
  const stats = await lstatIfPresent(
    input.layout.partial.journalPath,
  )
  if (stats === undefined) return true
  const partials =
    input.mutationAuthority.snapshot.namespaceIdentities.partials
  if (
    partials === undefined ||
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1n ||
    Number(stats.mode & 0o7777n) !== 0o600 ||
    Number(stats.uid) !==
      input.mutationAuthority.snapshot.expectedOwnerUid ||
    String(stats.dev) !== partials.device ||
    stats.size <= 0n ||
    stats.size > MAX_JOURNAL_BYTES
  ) {
    return false
  }
  let handle: FileHandle | undefined
  try {
    handle = await open(
      input.layout.partial.journalPath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    if (
      !sameStats(
        stats,
        await handle.stat({ bigint: true }),
      )
    ) {
      return false
    }
    const encoded = await handle.readFile('utf8')
    if (
      !sameStats(
        stats,
        await lstat(input.layout.partial.journalPath, {
          bigint: true,
        }),
      )
    ) {
      return false
    }
    return decodePairJournal(input, encoded)
  } catch {
    return false
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

function decodePairJournal(
  input: RetainedRuntimeArchiveInput,
  encoded: string,
): boolean {
  let value: unknown
  try {
    value = JSON.parse(encoded) as unknown
  } catch {
    return false
  }
  if (
    !isExactObject(value, [
      'descriptor',
      'kind',
      'schemaVersion',
      'strongEtag',
      'writtenBytes',
    ]) ||
    value.schemaVersion !== 1 ||
    value.kind !== 'runtime_archive_partial' ||
    typeof value.strongEtag !== 'string' ||
    !isStrongArchiveEtag(value.strongEtag) ||
    (value.writtenBytes !== 0 &&
      value.writtenBytes !==
        input.admission.descriptor.archive.bytes) ||
    !isExactObject(value.descriptor, [
      'archiveAssetName',
      'archiveBytes',
      'archiveSha256',
      'descriptorSha256',
      'launcherPackageName',
      'launcherVersion',
      'manifestSha256',
      'releaseId',
      'runtimeContractVersion',
      'target',
    ])
  ) {
    return false
  }
  const expectedDescriptor = {
    archiveAssetName:
      input.admission.descriptor.archive.assetName,
    archiveBytes: input.admission.descriptor.archive.bytes,
    archiveSha256: input.admission.descriptor.archive.sha256,
    descriptorSha256: createHash('sha256')
      .update(JSON.stringify(input.admission.descriptor), 'utf8')
      .digest('hex'),
    launcherPackageName: 'ay-ple',
    launcherVersion:
      input.admission.descriptor.launcher.version,
    manifestSha256: input.admission.identity.manifestSha256,
    releaseId: input.admission.identity.releaseId,
    runtimeContractVersion:
      input.admission.identity.runtimeContractVersion,
    target: input.admission.identity.target,
  }
  const descriptor = value.descriptor as Record<string, unknown>
  return Object.entries(expectedDescriptor).every(
    ([key, expected]) => descriptor[key] === expected,
  )
}

async function findPartialQuarantinePair(input: {
  readonly archiveIdentity: RuntimeFileSystemIdentity
  readonly archiveSize: string
  readonly cache: ArchiveCacheAuthority
  readonly input: RetainedRuntimeArchiveInput
}): Promise<
  | {
      readonly rootIdentity: RuntimeFileSystemIdentity
      readonly transactionNonce: string
    }
  | undefined
> {
  const prefix =
    `partial-${input.input.admission.identity.archiveSha256}-`
  const candidates: {
    rootIdentity: RuntimeFileSystemIdentity
    transactionNonce: string
  }[] = []
  let entries: string[]
  try {
    entries = await readdir(
      input.input.layout.namespaces.quarantine,
    )
  } catch (error) {
    throw ambiguousArchive(error)
  }
  for (const entry of entries) {
    if (!entry.startsWith(prefix)) continue
    const transactionNonce = entry.slice(prefix.length)
    if (!/^[0-9a-f]{32}$/u.test(transactionNonce)) continue
    const rootIdentity = await inspectExactPair({
      archiveIdentity: input.archiveIdentity,
      archiveSize: input.archiveSize,
      expectedRootDevice: input.cache.quarantine.device,
      input: input.input,
      rootPath: path.join(
        input.input.layout.namespaces.quarantine,
        entry,
      ),
    })
    if (rootIdentity !== undefined) {
      candidates.push({ rootIdentity, transactionNonce })
    }
  }
  return candidates.length === 1 ? candidates[0] : undefined
}

async function pairIsStable(
  input: RetainedRuntimeArchiveInput,
  cache: ArchiveCacheAuthority,
  authority: PairedArchiveAuthority,
  rootPath: string,
): Promise<boolean> {
  const expectedRootDevice =
    authority.phase === 'canonical'
      ? cache.partials.device
      : cache.quarantine.device
  const current = await inspectExactPair({
    archiveIdentity: authority.archiveIdentity,
    archiveSize: authority.archiveSize,
    expectedRootDevice,
    input,
    rootPath,
  })
  return (
    current !== undefined &&
    sameIdentity(current, authority.partialRootIdentity) &&
    (await archivePathIsStable(input, cache, authority))
  )
}

async function assertPairAuthority(
  input: RetainedRuntimeArchiveInput,
  cache: ArchiveCacheAuthority,
  authority: PairedArchiveAuthority,
  rootPath: string,
): Promise<void> {
  if (!(await pairIsStable(input, cache, authority, rootPath))) {
    throw ambiguousArchive()
  }
}

async function assertQuarantineReadback(input: {
  readonly archiveDestination: string
  readonly authority: RetainedArchiveQuarantineAuthority
  readonly cache: ArchiveCacheAuthority
  readonly input: RetainedRuntimeArchiveInput
  readonly partialDestination: string
}): Promise<void> {
  assertSameCacheAuthority(
    input.cache,
    await revalidateArchiveAuthority(input.input),
  )
  await assertCanonicalAbsence(input.input.layout.archive.path)
  const archiveStats = await lstat(input.archiveDestination, {
    bigint: true,
  })
  const identity = identityFromStats(archiveStats)
  if (
    !archiveStats.isFile() ||
    archiveStats.isSymbolicLink() ||
    Number(archiveStats.mode & 0o7777n) !== 0o600 ||
    String(archiveStats.size) !== input.authority.archiveSize ||
    !sameIdentity(identity, input.authority.archiveIdentity)
  ) {
    throw ambiguousArchive()
  }
  if (input.authority.form === 'single') {
    if (archiveStats.nlink !== 1n) throw ambiguousArchive()
    assertSameCacheAuthority(
      input.cache,
      await revalidateArchiveAuthority(input.input),
    )
    return
  }
  await assertCanonicalAbsence(input.input.layout.partial.root)
  const rootIdentity = await inspectExactPair({
    archiveIdentity: input.authority.archiveIdentity,
    archiveSize: input.authority.archiveSize,
    expectedRootDevice: input.cache.quarantine.device,
    input: input.input,
    rootPath: input.partialDestination,
  })
  if (
    archiveStats.nlink !== 2n ||
    rootIdentity === undefined ||
    !sameIdentity(
      rootIdentity,
      input.authority.partialRootIdentity,
    )
  ) {
    throw ambiguousArchive()
  }
  assertSameCacheAuthority(
    input.cache,
    await revalidateArchiveAuthority(input.input),
  )
}

async function syncNamespacePair(
  firstIdentity: RuntimeFileSystemIdentity,
  firstPath: string,
  secondIdentity: RuntimeFileSystemIdentity,
  secondPath: string,
): Promise<void> {
  await syncDirectory(firstPath, firstIdentity)
  await syncDirectory(secondPath, secondIdentity)
}

async function syncDirectory(
  directory: string,
  expectedIdentity: RuntimeFileSystemIdentity,
): Promise<void> {
  let handle: FileHandle | undefined
  try {
    handle = await open(
      directory,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    const stats = await handle.stat({ bigint: true })
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      Number(stats.mode & 0o7777n) !== 0o700 ||
      !sameIdentity(identityFromStats(stats), expectedIdentity)
    ) {
      throw ambiguousArchive()
    }
    await handle.sync()
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

async function assertDirectoryIdentity(
  directory: string,
  expectedIdentity: RuntimeFileSystemIdentity,
): Promise<void> {
  const stats = await lstat(directory, { bigint: true })
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    Number(stats.mode & 0o7777n) !== 0o700 ||
    !sameIdentity(identityFromStats(stats), expectedIdentity) ||
    (await realpath(directory)) !== directory
  ) {
    throw ambiguousArchive()
  }
}

function isExactPairFile(
  stats: BigIntStats,
  archiveIdentity: RuntimeFileSystemIdentity,
  archiveSize: string,
): boolean {
  return (
    stats.isFile() &&
    !stats.isSymbolicLink() &&
    stats.nlink === 2n &&
    Number(stats.mode & 0o7777n) === 0o600 &&
    String(stats.size) === archiveSize &&
    sameIdentity(identityFromStats(stats), archiveIdentity)
  )
}

async function assertPathAbsent(targetPath: string): Promise<void> {
  if ((await lstatIfPresent(targetPath)) !== undefined) {
    throw ambiguousArchive()
  }
}

async function assertCanonicalAbsence(
  targetPath: string,
): Promise<void> {
  await assertPathAbsent(targetPath)
}

async function lstatIfPresent(
  targetPath: string,
): Promise<BigIntStats | undefined> {
  try {
    return await lstat(targetPath, { bigint: true })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return undefined
    }
    throw ambiguousArchive(error)
  }
}

function sameQuarantineAuthority(
  left: RetainedArchiveQuarantineAuthority,
  right: RetainedArchiveQuarantineAuthority,
): boolean {
  return (
    left.form === right.form &&
    left.archiveSize === right.archiveSize &&
    sameIdentity(left.archiveIdentity, right.archiveIdentity) &&
    (left.form === 'single' ||
      (right.form === 'exact-pair' &&
        left.phase === right.phase &&
        left.transactionNonce === right.transactionNonce &&
        sameIdentity(
          left.partialRootIdentity,
          right.partialRootIdentity,
        )))
  )
}

function assertBindings(input: RetainedRuntimeArchiveInput): void {
  const digest = input.admission.identity.archiveSha256
  const expectedArchive = path.join(
    input.layout.cacheRoot,
    'archives',
    `${digest}.tar.gz`,
  )
  const expectedPartialRoot = path.join(
    input.layout.cacheRoot,
    'partials',
    digest,
  )
  if (
    input.layout.appDataRoot !==
      input.mutationAuthority.snapshot.appDataRoot ||
    input.layout.cacheRoot !==
      input.mutationAuthority.snapshot.cacheRoot ||
    input.layout.identity.archiveSha256 !==
      input.admission.identity.archiveSha256 ||
    input.layout.identity.manifestSha256 !==
      input.admission.identity.manifestSha256 ||
    input.layout.identity.releaseId !==
      input.admission.identity.releaseId ||
    input.layout.identity.runtimeContractVersion !==
      input.admission.identity.runtimeContractVersion ||
    input.layout.identity.target !==
      input.admission.identity.target ||
    input.layout.namespaces.archives !==
      path.join(input.layout.cacheRoot, 'archives') ||
    input.layout.namespaces.partials !==
      path.join(input.layout.cacheRoot, 'partials') ||
    input.layout.namespaces.quarantine !==
      path.join(input.layout.cacheRoot, 'quarantine') ||
    input.layout.archive.path !== expectedArchive ||
    input.layout.partial.root !== expectedPartialRoot ||
    input.layout.partial.archivePath !==
      path.join(expectedPartialRoot, 'archive.part') ||
    input.layout.partial.journalPath !==
      path.join(expectedPartialRoot, 'journal.json')
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_retained_archive_binding_invalid',
    })
  }
}

function assertTransactionNonce(value: string): void {
  if (!/^[0-9a-f]{32}$/u.test(value)) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_retained_archive_nonce_invalid',
    })
  }
}

function assertNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw runtimeAuthorityError('runtime_cancelled', {
      kind: 'runtime_retained_archive_cancelled',
    })
  }
}

function ambiguousArchive(
  cause?: unknown,
): RuntimeReleaseAuthorityError {
  return runtimeAuthorityError('runtime_recovery_required', {
    kind: 'runtime_retained_archive_ambiguous',
    ...(cause === undefined ? {} : { cause }),
  })
}

function identityFromStats(
  stats: BigIntStats,
): RuntimeFileSystemIdentity {
  return {
    device: String(stats.dev),
    inode: String(stats.ino),
    ownerUid: Number(stats.uid),
  }
}

function sameIdentity(
  left: RuntimeFileSystemIdentity,
  right: RuntimeFileSystemIdentity,
): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.ownerUid === right.ownerUid
  )
}

function assertSameCacheAuthority(
  left: ArchiveCacheAuthority,
  right: ArchiveCacheAuthority,
): void {
  if (
    left.expectedOwnerUid !== right.expectedOwnerUid ||
    !sameIdentity(left.archives, right.archives) ||
    !sameIdentity(left.partials, right.partials) ||
    !sameIdentity(left.quarantine, right.quarantine)
  ) {
    throw ambiguousArchive()
  }
}

function sameStats(left: BigIntStats, right: BigIntStats): boolean {
  return (
    sameIdentity(identityFromStats(left), identityFromStats(right)) &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size
  )
}

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function isExactObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return sameStrings(actual, expected)
}

function isCancellationError(error: unknown): boolean {
  return (
    error instanceof RuntimeReleaseAuthorityError &&
    error.failure.code === 'runtime_cancelled'
  )
}

function isNodeError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
