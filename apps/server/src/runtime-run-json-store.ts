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
  isRuntimeRunId,
  parseRuntimeRunId,
  parseRuntimeRunLog,
  type RuntimeRunLog,
  type RuntimeRunLogPersistence,
  type RuntimeRunLogPersistenceSaveResult,
} from '@ay-ple/runtime-core'

const schemaVersion = 1

type RuntimeRunSnapshotEnvelope = {
  schemaVersion: 1
  savedAt: string
  log: RuntimeRunLog
}

export type RuntimeRunJsonStoreOptions = {
  directory: string
  now?: () => Date
  renameFile?: (sourcePath: string, destinationPath: string) => Promise<void>
}

export class RuntimeRunJsonStore implements RuntimeRunLogPersistence {
  private readonly directory: string
  private readonly now: () => Date
  private readonly renameFile: (
    sourcePath: string,
    destinationPath: string,
  ) => Promise<void>

  constructor(options: RuntimeRunJsonStoreOptions) {
    this.directory = options.directory
    this.now = options.now ?? (() => new Date())
    this.renameFile = options.renameFile ?? rename
  }

  async load(): Promise<RuntimeRunLog[]> {
    await mkdir(this.directory, { recursive: true })

    const directoryEntries = await readdir(this.directory, {
      withFileTypes: true,
    })

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

    const canonicalFilenames = directoryEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name)
      .sort()
    const logs: RuntimeRunLog[] = []

    for (const filename of canonicalFilenames) {
      logs.push(await this.loadCanonicalRecord(filename))
    }

    return logs.sort(compareRuntimeRunLogs)
  }

  async save(
    log: RuntimeRunLog,
  ): Promise<RuntimeRunLogPersistenceSaveResult> {
    parseRuntimeRunId(log.runId, 'run ID')

    const envelope: RuntimeRunSnapshotEnvelope = {
      schemaVersion,
      savedAt: this.now().toISOString(),
      log,
    }
    const contents = `${JSON.stringify(envelope)}\n`
    const canonicalPath = this.canonicalPath(log.runId)
    const temporaryPath = path.join(
      this.directory,
      `.${log.runId}.${randomUUID()}.tmp`,
    )

    await mkdir(this.directory, { recursive: true })

    let fileHandle: FileHandle | undefined

    try {
      fileHandle = await open(temporaryPath, 'wx')
      await fileHandle.writeFile(contents, 'utf8')
      await fileHandle.sync()
      await fileHandle.close()
      fileHandle = undefined
      await this.renameFile(temporaryPath, canonicalPath)
    } catch (error) {
      await fileHandle?.close().catch(() => {})
      await rm(temporaryPath, { force: true }).catch(() => {})
      throw error
    }

    return { removedRunIds: [] }
  }

  async remove(runId: string): Promise<void> {
    parseRuntimeRunId(runId, 'run ID')
    await rm(this.canonicalPath(runId), { force: true })
  }

  private async loadCanonicalRecord(filename: string): Promise<RuntimeRunLog> {
    const recordPath = path.join(this.directory, filename)

    try {
      const runId = parseRuntimeRunId(
        filename.slice(0, -'.json'.length),
        'filename run ID',
      )

      const contents = await readFile(recordPath, 'utf8')
      const envelope = parseRuntimeRunSnapshotEnvelope(contents)

      if (envelope.log.runId !== runId) {
        throw new Error(
          `filename run ID ${runId} does not match log run ID ${envelope.log.runId}`,
        )
      }

      return envelope.log
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
