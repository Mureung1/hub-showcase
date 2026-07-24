import path from 'node:path'

import type {
  AdmittedSemesterWorkspace,
} from '@ay-ple/semester-workspace'

export type ReadyWorkspacePresentation = {
  readonly semesterLabel: string
  readonly workspaceName: string
  readonly safeDisplayLocation: string
}

export function createReadyWorkspacePresenter(input: {
  readonly userHome: string
}): (
  workspace: AdmittedSemesterWorkspace,
) => ReadyWorkspacePresentation {
  if (
    !path.isAbsolute(input.userHome) ||
    path.resolve(input.userHome) !== input.userHome ||
    hasControl(input.userHome)
  ) {
    throw new TypeError('A safe user home is required')
  }
  const userHome = input.userHome
  const userName = path.basename(userHome)
  if (!isPublicSafeSegment(userName)) {
    throw new TypeError('A safe user home is required')
  }
  return (workspace) => {
    const root = workspace.canonicalRoot
    const workspaceLeaf = path.basename(root)
    if (
      !path.isAbsolute(root) ||
      path.resolve(root) !== root ||
      !isFilesystemLeaf(workspaceLeaf)
    ) {
      throw new TypeError('A safe workspace leaf is required')
    }
    const workspaceName =
      workspaceLeaf.toLowerCase() === userName.toLowerCase() ||
      hasControl(workspaceLeaf) ||
      looksPrivate(workspaceLeaf)
        ? '학기 공간'
        : workspaceLeaf
    const relative = path.relative(userHome, root)
    const insideHome =
      relative !== '' &&
      !relative.startsWith('..') &&
      !path.isAbsolute(relative)
    const safeDisplayLocation = insideHome
      ? [
          'Home',
          ...relative.split(path.sep).filter(Boolean).map(
            (segment, index, segments) =>
              index === segments.length - 1
                ? workspaceName
                : safeBreadcrumbSegment(segment, userName),
          ),
        ].join(' › ')
      : `선택한 위치 › ${workspaceName}`
    if (
      hasControl(safeDisplayLocation) ||
      safeDisplayLocation.includes('/') ||
      safeDisplayLocation.includes('\\') ||
      safeDisplayLocation.includes(root) ||
      safeDisplayLocation.includes(path.dirname(root))
    ) {
      throw new TypeError('A safe workspace presentation is required')
    }
    const semesterLabel = safeSemesterLabel(workspace, userName)
    return {
      semesterLabel,
      workspaceName,
      safeDisplayLocation,
    }
  }
}

function safeSemesterLabel(
  workspace: AdmittedSemesterWorkspace,
  userName: string,
): string {
  const { semester } = workspace.manifest
  if (
    !Number.isSafeInteger(semester.yearLevel) ||
    semester.yearLevel <= 0
  ) {
    throw new TypeError('A safe semester year level is required')
  }
  const termLabel =
    semester.term.key === '1'
      ? '1학기'
      : semester.term.key === '2'
        ? '2학기'
        : semester.term.key === 'summer'
          ? '여름 계절학기'
          : semester.term.key === 'winter'
            ? '겨울 계절학기'
            : safeCustomTermLabel(
                semester.term.displayName,
                workspace,
                userName,
              )
  return `${semester.yearLevel}학년 ${termLabel}`
}

function safeCustomTermLabel(
  value: string,
  workspace: AdmittedSemesterWorkspace,
  userName: string,
): string {
  const label = value.trim()
  return (
    label.length > 0 &&
    !hasControl(label) &&
    !label.includes('/') &&
    !label.includes('\\') &&
    !includesPrivateValue(label, workspace.canonicalRoot) &&
    !includesPrivateValue(label, workspace.workspaceId) &&
    !includesPrivateValue(label, userName) &&
    !looksPrivate(label)
  )
    ? label
    : '기타 학기'
}

function safeBreadcrumbSegment(
  segment: string,
  userName: string,
): string {
  return (
    isPublicSafeSegment(segment) &&
    segment.toLowerCase() !== userName.toLowerCase() &&
    !looksPrivate(segment)
  )
    ? segment
    : '…'
}

function isFilesystemLeaf(segment: string): boolean {
  return (
    segment.length > 0 &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.includes('/') &&
    !segment.includes('\\')
  )
}

function isPublicSafeSegment(segment: string): boolean {
  return isFilesystemLeaf(segment) && !hasControl(segment)
}

function looksPrivate(segment: string): boolean {
  return (
    /(?:workspace|setup|release)_[a-z0-9_-]+/i.test(segment) ||
    /[0-9a-f]{64}/i.test(segment)
  )
}

function includesPrivateValue(
  value: string,
  privateValue: string,
): boolean {
  return value.toLowerCase().includes(privateValue.toLowerCase())
}

function hasControl(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value)
}
