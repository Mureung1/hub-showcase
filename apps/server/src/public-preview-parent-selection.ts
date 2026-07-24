import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { lstat, realpath } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import type {
  SemesterSetupParentSelection,
} from '@ay-ple/semester-workspace'

export type PublicPreviewParentPicker = (input: {
  readonly signal: AbortSignal
}) => Promise<string | null>

const execFileAsync = promisify(execFile)

export interface PublicPreviewParentSelectionPort {
  current(): SemesterSetupParentSelection | null
  resolve(selectionId: string): Promise<SemesterSetupParentSelection | null>
  select(input: {
    readonly signal: AbortSignal
  }): Promise<SemesterSetupParentSelection | null>
  beginShutdown(): void
}

export function createPublicPreviewParentSelectionPort(input: {
  readonly pick: PublicPreviewParentPicker
  readonly userHome: string
  readonly createSelectionId?: () => string
}): PublicPreviewParentSelectionPort {
  if (!isCanonicalAbsolute(input.userHome)) {
    throw new TypeError('A canonical user home is required')
  }
  const userHome = input.userHome
  const userName = path.basename(userHome)
  const createSelectionId =
    input.createSelectionId ??
    (() => `parent_selection_${randomUUID().replaceAll('-', '')}`)
  let selected: SemesterSetupParentSelection | null = null
  let selectionFlight:
    | Promise<SemesterSetupParentSelection | null>
    | undefined
  let pickerController: AbortController | undefined
  let shuttingDown = false

  const select = (
    signal: AbortSignal,
  ): Promise<SemesterSetupParentSelection | null> => {
    if (selectionFlight) return selectionFlight
    if (shuttingDown || signal.aborted) {
      return Promise.resolve(cloneSelection(selected))
    }
    const controller = new AbortController()
    pickerController = controller
    const abortPicker = () => controller.abort(signal.reason)
    signal.addEventListener('abort', abortPicker, { once: true })
    const flight = (async () => {
      try {
        const candidate = await input.pick({ signal: controller.signal })
        if (
          candidate === null ||
          controller.signal.aborted ||
          shuttingDown
        ) {
          return cloneSelection(selected)
        }
        const admitted = await inspectParent(
          candidate,
          createSelectionId(),
          userHome,
          userName,
        )
        if (admitted) selected = admitted
        return cloneSelection(selected)
      } catch (error) {
        if (controller.signal.aborted) return cloneSelection(selected)
        throw error
      } finally {
        signal.removeEventListener('abort', abortPicker)
      }
    })()
    selectionFlight = flight
    void flight.then(() => {
      if (pickerController === controller) pickerController = undefined
      if (selectionFlight === flight) selectionFlight = undefined
    }, () => {
      if (pickerController === controller) pickerController = undefined
      if (selectionFlight === flight) selectionFlight = undefined
    })
    return flight
  }

  return {
    current: () => cloneSelection(selected),
    async resolve(selectionId) {
      const current = selected
      if (
        !current ||
        current.authority.selectionId !== selectionId ||
        current.presentation.selectionId !== selectionId
      ) {
        return null
      }
      const inspected = await inspectParent(
        current.authority.canonicalParent,
        selectionId,
        userHome,
        userName,
      )
      if (
        !inspected ||
        inspected.authority.parentDevice !==
          current.authority.parentDevice ||
        inspected.authority.parentInode !==
          current.authority.parentInode
      ) {
        return null
      }
      return inspected
    },
    select: ({ signal }) => select(signal),
    beginShutdown() {
      shuttingDown = true
      pickerController?.abort()
    },
  }
}

export function createMacOsPublicPreviewParentPicker(options: {
  readonly platform?: NodeJS.Platform
} = {}): PublicPreviewParentPicker {
  return async ({ signal }) => {
    if ((options.platform ?? process.platform) !== 'darwin') {
      throw new Error('Parent folder selection is available on macOS')
    }
    const { stdout } = await execFileAsync(
      '/usr/bin/osascript',
      [
        '-e',
        [
          'try',
          'set chosenFolder to choose folder with prompt "AY-PLE 학기 공간을 만들 위치를 선택하세요."',
          'return POSIX path of chosenFolder',
          'on error number -128',
          'return ""',
          'end try',
        ].join('\n'),
      ],
      { signal },
    )
    const output = stdout.replace(/\r?\n$/u, '')
    const selected =
      output.length > 1 ? output.replace(/\/$/u, '') : output
    return selected.length > 0 ? selected : null
  }
}

async function inspectParent(
  candidate: string,
  selectionId: string,
  userHome: string,
  userName: string,
): Promise<SemesterSetupParentSelection | null> {
  if (
    !isOpaqueSelectionId(selectionId) ||
    !isCanonicalAbsolute(candidate)
  ) {
    return null
  }
  try {
    const stats = await lstat(candidate, { bigint: true })
    if (!stats.isDirectory() || stats.isSymbolicLink()) return null
    const canonicalParent = await realpath(candidate)
    if (canonicalParent !== candidate) return null
    const displayName = safeSegment(path.basename(candidate), userName)
    return {
      authority: {
        selectionId,
        canonicalParent,
        parentDevice: stats.dev.toString(),
        parentInode: stats.ino.toString(),
      },
      presentation: {
        selectionId,
        displayName,
        safeDisplayLocation: safeLocation(
          canonicalParent,
          userHome,
          userName,
        ),
      },
    }
  } catch {
    return null
  }
}

function safeLocation(
  canonicalParent: string,
  userHome: string,
  userName: string,
): string {
  if (canonicalParent === userHome) return 'Home'
  const relative = path.relative(userHome, canonicalParent)
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    relative.length === 0
  ) {
    return `선택한 위치 › ${safeSegment(
      path.basename(canonicalParent),
      userName,
    )}`
  }
  return [
    'Home',
    ...relative
      .split(path.sep)
      .filter(Boolean)
      .map((segment) => safeSegment(segment, userName)),
  ].join(' › ')
}

function safeSegment(segment: string, userName: string): string {
  return (
    isSafeLeaf(segment) &&
    !includesPrivateValue(segment, userName) &&
    !looksPrivate(segment)
  )
    ? segment
    : '선택한 폴더'
}

function isCanonicalAbsolute(value: string): boolean {
  return (
    path.isAbsolute(value) &&
    path.resolve(value) === value &&
    !hasControl(value)
  )
}

function isSafeLeaf(value: string): boolean {
  return (
    value.length > 0 &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !hasControl(value)
  )
}

function isOpaqueSelectionId(value: string): boolean {
  return /^parent_selection_[0-9a-z_-]+$/u.test(value)
}

function looksPrivate(value: string): boolean {
  return (
    /(?:workspace|setup|release)_[a-z0-9_-]+/iu.test(value) ||
    /[0-9a-f]{64}/iu.test(value)
  )
}

function includesPrivateValue(
  value: string,
  privateValue: string,
): boolean {
  return (
    privateValue.length > 0 &&
    value.toLowerCase().includes(privateValue.toLowerCase())
  )
}

function hasControl(value: string): boolean {
  return /[\u0000-\u001f\u007f]/u.test(value)
}

function cloneSelection(
  selection: SemesterSetupParentSelection | null,
): SemesterSetupParentSelection | null {
  if (!selection) return null
  return {
    authority: { ...selection.authority },
    presentation: { ...selection.presentation },
  }
}
