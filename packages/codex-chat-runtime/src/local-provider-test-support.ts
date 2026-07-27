import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const OFFICIAL_SDK_TESTS = path.join(
  PACKAGE_ROOT,
  'python',
  'openai-codex',
  'sdk',
  'python',
  'tests',
)
const DEFAULT_PROCESS_GROUP_WAIT_MS = 5_000
const PROCESS_GROUP_ESCALATION_MS = 2_000

export interface LocalProviderPythonBundle {
  readonly codexPathDirectory: string
  readonly pythonExecutable: string
  readonly sitePackages: string
}

export function controlledPythonEnvironment(
  bundle: LocalProviderPythonBundle,
  root: string,
): NodeJS.ProcessEnv {
  return {
    HOME: root,
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    PATH: [
      bundle.codexPathDirectory,
      path.dirname(bundle.pythonExecutable),
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ].join(path.delimiter),
    PYTHONDONTWRITEBYTECODE: '1',
    PYTHONNOUSERSITE: '1',
    PYTHONPATH: [OFFICIAL_SDK_TESTS, bundle.sitePackages].join(path.delimiter),
    PYTHONUNBUFFERED: '1',
    PYTHONUTF8: '1',
    TMPDIR: root,
  }
}

export async function waitForJsonFile<T>(options: {
  readonly child: ChildProcessWithoutNullStreams
  readonly exitedMessage: string
  readonly filePath: string
  readonly retryReadError: (error: unknown) => boolean
  readonly timeoutMessage: string
  readonly timeoutMs: number
}): Promise<T> {
  const deadline = Date.now() + options.timeoutMs
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile(options.filePath, 'utf8')) as T
    } catch (error) {
      if (!options.retryReadError(error)) throw error
      if (
        options.child.exitCode !== null ||
        options.child.signalCode !== null
      ) {
        throw new Error(options.exitedMessage)
      }
      await delay(10)
    }
  }
  throw new Error(options.timeoutMessage)
}

export async function terminateDetachedProcessGroup(options: {
  readonly child: ChildProcessWithoutNullStreams
  readonly childCloseTimeoutMessage?: string
  readonly processGroupId: number
}): Promise<void> {
  options.child.stdin.destroy()
  const childCloseTimeoutMessage = options.childCloseTimeoutMessage
  let childClosed: Promise<void> | undefined
  if (childCloseTimeoutMessage !== undefined) {
    childClosed =
      options.child.exitCode !== null || options.child.signalCode !== null
        ? Promise.resolve()
        : new Promise<void>((resolvePromise) => {
            options.child.once('error', () => resolvePromise())
            options.child.once('close', () => resolvePromise())
          })
  }

  for (const signal of ['SIGTERM', 'SIGKILL'] as const) {
    try {
      process.kill(-options.processGroupId, signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
    try {
      await Promise.all([
        ...(childClosed === undefined || childCloseTimeoutMessage === undefined
          ? []
          : [
              withinDuration(
                childClosed,
                PROCESS_GROUP_ESCALATION_MS,
                childCloseTimeoutMessage,
              ),
            ]),
        waitForProcessGroupExit(
          options.processGroupId,
          PROCESS_GROUP_ESCALATION_MS,
        ),
      ])
      return
    } catch (error) {
      if (signal === 'SIGKILL') throw error
    }
  }
}

export async function waitForProcessGroupExit(
  processGroupId: number,
  timeoutMs = DEFAULT_PROCESS_GROUP_WAIT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      process.kill(-processGroupId, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return
      throw error
    }
    await delay(10)
  }
  throw new Error(`Process group ${processGroupId} did not disappear`)
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}

export async function withinDuration<T>(
  value: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      value,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
