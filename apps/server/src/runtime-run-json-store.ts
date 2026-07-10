import { randomUUID } from 'node:crypto'
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  type FileHandle,
} from 'node:fs/promises'
import path from 'node:path'
import {
  compareRuntimeRunLogs,
  isTerminalRuntimeRunStatus,
  isRuntimeRunId,
  parseRuntimeRunId,
  parseRuntimeRunLog,
  type RuntimeRunLog,
  type RuntimeRunLogPersistence,
  type RuntimeRunLogPersistenceMutationResult,
} from '@ay-ple/runtime-core'

const schemaVersion = 1
export const defaultRuntimeHistoryMaxRuns = 100
export const defaultRuntimeHistoryMaxBytes = 104_857_600

type RuntimeRunSnapshotEnvelope = {
  schemaVersion: 1
  savedAt: string
  log: RuntimeRunLog
}

export type RuntimeRunJsonStoreOptions = {
  directory: string
  maxTerminalRuns?: number
  maxTerminalBytes?: number
  now?: () => Date
  renameFile?: (sourcePath: string, destinationPath: string) => Promise<void>
}

type StoredRuntimeRunRecord = {
  byteSize: number
  log: RuntimeRunLog
}

export class RuntimeRunJsonStore implements RuntimeRunLogPersistence {
  private readonly directory: string
  private readonly maxTerminalRuns: number
  private readonly maxTerminalBytes: number
  private readonly now: () => Date
  private readonly renameFile: (
    sourcePath: string,
    destinationPath: string,
  ) => Promise<void>
  private readonly removedRunIds = new Set<string>()
  private operationQueue: Promise<void> = Promise.resolve()
  private startupRetentionPending = false

  constructor(options: RuntimeRunJsonStoreOptions) {
    this.directory = options.directory
    this.maxTerminalRuns = parsePositiveSafeInteger(
      options.maxTerminalRuns ?? defaultRuntimeHistoryMaxRuns,
      'maxTerminalRuns',
    )
    this.maxTerminalBytes = parsePositiveSafeInteger(
      options.maxTerminalBytes ?? defaultRuntimeHistoryMaxBytes,
      'maxTerminalBytes',
    )
    this.now = options.now ?? (() => new Date())
    this.renameFile = options.renameFile ?? rename
  }

  async load(): Promise<RuntimeRunLog[]> {
    return this.runOperation(async () => {
      const records = await this.loadRecords({ cleanTemporaryFiles: true })
      this.startupRetentionPending = true

      return records.map((record) => record.log).sort(compareRuntimeRunLogs)
    })
  }

  async applyRetention(): Promise<RuntimeRunLogPersistenceMutationResult> {
    return this.runOperation(async () => {
      const result = await this.applyRetentionWithinOperation()
      this.startupRetentionPending = false

      return result
    })
  }

  async save(
    log: RuntimeRunLog,
  ): Promise<RuntimeRunLogPersistenceMutationResult> {
    parseRuntimeRunId(log.runId, 'run ID')

    return this.runOperation(async () => {
      if (this.removedRunIds.has(log.runId)) {
        return { removedRunIds: [log.runId] }
      }

      const envelope: RuntimeRunSnapshotEnvelope = {
        schemaVersion,
        savedAt: this.now().toISOString(),
        log,
      }
      const contents = Buffer.from(`${JSON.stringify(envelope)}\n`, 'utf8')

      if (
        isTerminalRuntimeRunStatus(log.status) &&
        contents.byteLength > this.maxTerminalBytes
      ) {
        throw new Error(
          `Runtime terminal envelope ${log.runId} is ${contents.byteLength} bytes and exceeds the ${this.maxTerminalBytes} byte limit`,
        )
      }

      await this.writeCanonicalRecord(log.runId, contents)

      if (!isTerminalRuntimeRunStatus(log.status)) {
        return { removedRunIds: [] }
      }

      if (this.startupRetentionPending) {
        return { removedRunIds: [] }
      }

      return this.applyRetentionWithinOperation()
    })
  }

  async remove(runId: string): Promise<void> {
    parseRuntimeRunId(runId, 'run ID')

    await this.runOperation(async () => {
      await rm(this.canonicalPath(runId), { force: true })
      this.removedRunIds.add(runId)
    })
  }

  private async loadRecords(options: {
    cleanTemporaryFiles: boolean
  }): Promise<StoredRuntimeRunRecord[]> {
    await mkdir(this.directory, { recursive: true })

    const directoryEntries = await readdir(this.directory, {
      withFileTypes: true,
    })

    if (options.cleanTemporaryFiles) {
      for (const entry of directoryEntries) {
        if (!entry.isFile() || !isRuntimeRunTemporaryFilename(entry.name)) {
          continue
        }

        const temporaryPath = path.join(this.directory, entry.name)

        try {
          await rm(temporaryPath, { force: true })
        } catch (error) {
          console.warn(
            `Unable to remove stale runtime history temporary file ${temporaryPath}: ${toErrorMessage(error)}`,
          )
        }
      }
    }

    const canonicalFilenames = directoryEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort()
    const records: StoredRuntimeRunRecord[] = []

    for (const filename of canonicalFilenames) {
      records.push(await this.loadCanonicalRecord(filename))
    }

    return records
  }

  private async writeCanonicalRecord(
    runId: string,
    contents: Buffer,
  ): Promise<void> {
    const canonicalPath = this.canonicalPath(runId)
    const temporaryPath = path.join(
      this.directory,
      `.${runId}.${randomUUID()}.tmp`,
    )

    await mkdir(this.directory, { recursive: true })

    let fileHandle: FileHandle | undefined

    try {
      fileHandle = await open(temporaryPath, 'wx')
      await fileHandle.writeFile(contents)
      await fileHandle.sync()
      await fileHandle.close()
      fileHandle = undefined
      await this.renameFile(temporaryPath, canonicalPath)
    } catch (error) {
      await fileHandle?.close().catch(() => {})
      await rm(temporaryPath, { force: true }).catch(() => {})
      throw error
    }
  }

  private async applyRetentionWithinOperation(): Promise<RuntimeRunLogPersistenceMutationResult> {
    const records = await this.loadRecords({ cleanTemporaryFiles: false })
    const terminalRecords = records
      .filter((record) => isTerminalRuntimeRunStatus(record.log.status))
      .sort(compareTerminalRetentionOrder)
    let terminalCount = terminalRecords.length
    let terminalBytes = terminalRecords.reduce(
      (total, record) => total + record.byteSize,
      0,
    )
    const removedRunIds: string[] = []

    for (const record of terminalRecords) {
      if (
        terminalCount <= this.maxTerminalRuns &&
        terminalBytes <= this.maxTerminalBytes
      ) {
        break
      }

      await rm(this.canonicalPath(record.log.runId), { force: true })
      this.removedRunIds.add(record.log.runId)
      removedRunIds.push(record.log.runId)
      terminalCount -= 1
      terminalBytes -= record.byteSize
    }

    return { removedRunIds }
  }

  private async loadCanonicalRecord(
    filename: string,
  ): Promise<StoredRuntimeRunRecord> {
    const recordPath = path.join(this.directory, filename)

    try {
      const runId = parseRuntimeRunId(
        filename.slice(0, -'.json'.length),
        'filename run ID',
      )

      const contents = await readFile(recordPath)
      const envelope = parseRuntimeRunSnapshotEnvelope(
        contents.toString('utf8'),
      )

      if (envelope.log.runId !== runId) {
        throw new Error(
          `filename run ID ${runId} does not match log run ID ${envelope.log.runId}`,
        )
      }

      return {
        byteSize: contents.byteLength,
        log: envelope.log,
      }
    } catch (error) {
      throw new Error(
        `Invalid runtime history record ${recordPath}: ${toErrorMessage(error)}`,
        { cause: error },
      )
    }
  }

  private canonicalPath(runId: string): string {
    return path.join(this.directory, `${runId}.json`)
  }

  private runOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation)
    this.operationQueue = result.then(
      () => {},
      () => {},
    )

    return result
  }
}

function compareTerminalRetentionOrder(
  left: StoredRuntimeRunRecord,
  right: StoredRuntimeRunRecord,
): number {
  const completedAtComparison = terminalTimestamp(left.log).localeCompare(
    terminalTimestamp(right.log),
  )

  if (completedAtComparison !== 0) {
    return completedAtComparison
  }

  const startedAtComparison = left.log.startedAt.localeCompare(
    right.log.startedAt,
  )

  if (startedAtComparison !== 0) {
    return startedAtComparison
  }

  return left.log.runId.localeCompare(right.log.runId)
}

function terminalTimestamp(log: RuntimeRunLog): string {
  if (log.completedAt !== undefined) {
    return log.completedAt
  }

  const terminalEvent = log.events.at(-1)

  if (
    terminalEvent?.type !== 'completed' &&
    terminalEvent?.type !== 'cancelled' &&
    terminalEvent?.type !== 'failed'
  ) {
    throw new Error(`Terminal runtime run ${log.runId} has no terminal event`)
  }

  return terminalEvent.timestamp
}

export function parsePositiveSafeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`)
  }

  return value
}

function parseRuntimeRunSnapshotEnvelope(
  contents: string,
): RuntimeRunSnapshotEnvelope {
  let parsed: unknown

  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    throw new Error(`malformed JSON: ${toErrorMessage(error)}`, { cause: error })
  }

  assertRecord(parsed, 'snapshot envelope')
  assertExactKeys(
    parsed,
    ['schemaVersion', 'savedAt', 'log'],
    'snapshot envelope',
  )

  if (parsed.schemaVersion !== schemaVersion) {
    throw new Error(`unsupported schemaVersion: ${String(parsed.schemaVersion)}`)
  }

  assertIsoTimestamp(parsed.savedAt, 'snapshot savedAt')

  return {
    schemaVersion,
    savedAt: parsed.savedAt,
    log: parseRuntimeRunLog(parsed.log),
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: string[],
  label: string,
): void {
  const expectedKeys = new Set(keys)

  for (const key of keys) {
    if (!(key in value)) {
      throw new Error(`${label} is missing ${key}`)
    }
  }

  for (const key of Object.keys(value)) {
    if (!expectedKeys.has(key)) {
      throw new Error(`${label} contains unexpected field ${key}`)
    }
  }
}

function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }
}

function assertIsoTimestamp(
  value: unknown,
  label: string,
): asserts value is string {
  assertString(value, label)

  const parsedTime = new Date(value)

  if (Number.isNaN(parsedTime.getTime()) || parsedTime.toISOString() !== value) {
    throw new Error(`${label} must be an ISO 8601 UTC timestamp`)
  }
}

function isRuntimeRunTemporaryFilename(filename: string): boolean {
  const segments = filename.split('.')

  return (
    segments.length === 4 &&
    segments[0] === '' &&
    isRuntimeRunId(segments[1]) &&
    isRuntimeRunId(segments[2]) &&
    segments[3] === 'tmp'
  )
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
